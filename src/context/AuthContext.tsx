import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Role } from "@/lib/mock-data";
import {
  DEMO_ACCOUNTS,
  canAccess,
  hasCapability,
  type Capability,
  type DemoAccount,
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
}

interface AuthValue {
  user: SessionUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => { ok: boolean; error?: string; user?: SessionUser };
  signOut: () => void;
  can: (path: string) => boolean;
  hasCapability: (capability: Capability) => boolean;
}

const STORAGE_KEY = "policybear.session";

const AuthContext = createContext<AuthValue | null>(null);

function toSession(account: DemoAccount): SessionUser {
  const { password: _password, ...rest } = account;
  return rest;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as SessionUser);
    } catch {
      /* ignore malformed session */
    }
    setReady(true);
  }, []);

  const signIn = useCallback((email: string, password: string) => {
    const account = DEMO_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!account || account.password !== password) {
      return { ok: false, error: "Invalid work email or password." };
    }
    const session = toSession(account);
    setUser(session);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* storage unavailable */
    }
    return { ok: true, user: session };
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      signIn,
      signOut,
      can: (path: string) => canAccess(user?.role, path),
      hasCapability: (capability: Capability) => hasCapability(user?.role, capability),
    }),
    [user, ready, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
