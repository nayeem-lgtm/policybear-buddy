import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import { recordAudit } from "@/lib/audit-log";
import { provisionStaffAccounts } from "@/lib/auth.functions";
import { recordStatusChange } from "@/lib/shift.functions";
import type { Role } from "@/lib/mock-data";
import {
  DEMO_ACCOUNTS,
  canAccess,
  hasCapability,
  type Capability,
  type Department,
} from "@/lib/rbac";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: Department;
  title: string;
  team: string;
  avatarInitials: string;
  landing: string;
  presence: string;
  avatarUrl: string | null;
}

interface AuthValue {
  user: SessionUser | null;
  ready: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string | undefined; user?: SessionUser | undefined }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setPresence: (presence: string) => Promise<void>;
  can: (path: string) => boolean;
  hasCapability: (capability: Capability) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

const ROLE_PRIORITY: Role[] = [
  "CEO",
  "Administrator",
  "Operations",
  "HR",
  "Accounting",
  "QC",
  "Agent",
];

function pickRole(roles: string[]): Role {
  for (const role of ROLE_PRIORITY) if (roles.includes(role)) return role;
  return "Agent";
}

async function loadSessionUser(userId: string, email: string): Promise<SessionUser | null> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, department, title, team, avatar_initials, avatar_url, presence, landing")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const fallback = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());
  const role = pickRole((roles ?? []).map((r) => r.role as string));

  return {
    id: userId,
    name: profile?.name || fallback?.name || email,
    email,
    role: roles && roles.length > 0 ? role : (fallback?.role ?? "Agent"),
    department: (profile?.department as Department) ?? fallback?.department ?? "Sales Floor",
    title: profile?.title || fallback?.title || "",
    team: profile?.team || fallback?.team || "",
    avatarInitials:
      profile?.avatar_initials && profile.avatar_initials !== "??"
        ? profile.avatar_initials
        : (fallback?.avatarInitials ??
          email.slice(0, 2).toUpperCase()),
    landing: profile?.landing || fallback?.landing || "/dashboard",
    presence: profile?.presence ?? "offline",
    avatarUrl: profile?.avatar_url ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const hydrate = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.user) {
      setUser(null);
      return;
    }
    setUser(await loadSessionUser(session.user.id, session.user.email ?? ""));
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      await hydrate();
      if (active) setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        return;
      }
      void loadSessionUser(session.user.id, session.user.email ?? "").then((next) => {
        if (active) setUser(next);
      });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim().toLowerCase();
    let result = await supabase.auth.signInWithPassword({ email: trimmed, password });

    // First-run bootstrap: create the fixed department accounts on demand.
    if (result.error && DEMO_ACCOUNTS.some((a) => a.email.toLowerCase() === trimmed)) {
      try {
        await provisionStaffAccounts();
        result = await supabase.auth.signInWithPassword({ email: trimmed, password });
      } catch {
        /* fall through to the original error */
      }
    }

    if (result.error || !result.data.user) {
      recordAudit({
        actor: trimmed,
        actorEmail: trimmed,
        category: "Auth",
        action: "Sign-in failed",
        recordType: "Session",
        recordId: trimmed,
        reason: result.error?.message ?? "Sign in failed.",
      });
      return { ok: false, error: result.error?.message ?? "Sign in failed." };
    }

    const next = await loadSessionUser(result.data.user.id, result.data.user.email ?? trimmed);
    setUser(next);
    await supabase.from("profiles").update({ presence: "online" }).eq("id", result.data.user.id);
    recordAudit({
      actor: next?.name ?? trimmed,
      actorEmail: trimmed,
      category: "Auth",
      action: "Signed in",
      recordType: "Session",
      recordId: result.data.user.id,
      detail: { role: next?.role ?? "Agent", landing: next?.landing ?? "/dashboard" },
    });
    return { ok: true, user: next ?? undefined };
  }, []);

  const signOut = useCallback(async () => {
    if (user) {
      // Close today's attendance record before the session token is dropped.
      try {
        await recordStatusChange({ data: { status: "Signed Out", detail: "Signed out of CRM" } });
      } catch {
        /* stale sessions are auto-closed server-side */
      }
      await supabase.from("profiles").update({ presence: "offline" }).eq("id", user.id);
    }
    if (user) {
      recordAudit({
        actor: user.name,
        actorEmail: user.email,
        category: "Auth",
        action: "Signed out",
        recordType: "Session",
        recordId: user.id,
      });
    }
    await supabase.auth.signOut();
    setUser(null);
  }, [user]);


  const setPresence = useCallback(
    async (presence: string) => {
      if (!user) return;
      setUser((prev) => (prev ? { ...prev, presence } : prev));
      await supabase.from("profiles").update({ presence }).eq("id", user.id);
    },
    [user],
  );

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      signIn,
      signOut,
      refresh: hydrate,
      setPresence,
      can: (path: string) => canAccess(user?.role, path),
      hasCapability: (capability: Capability) => hasCapability(user?.role, capability),
    }),
    [user, ready, signIn, signOut, hydrate, setPresence],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
