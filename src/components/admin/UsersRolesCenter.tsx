import { useMemo, useState } from "react";
import {
  Check,
  Code2,
  Headphones,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Role model                                                                 */
/* -------------------------------------------------------------------------- */

export type StaffRole = "Admin" | "Manager" | "Agent" | "QA Analyst" | "Developer";

const ROLE_ORDER: StaffRole[] = ["Admin", "Manager", "Agent", "QA Analyst", "Developer"];

const ROLE_META: Record<
  StaffRole,
  {
    icon: typeof Users;
    tagline: string;
    accent: string;
    ring: string;
    landing: string;
    highlights: string[];
  }
> = {
  Admin: {
    icon: ShieldCheck,
    tagline: "Full control of the platform, billing and access",
    accent: "bg-brand/12 text-brand",
    ring: "ring-brand/25",
    landing: "/admin/users",
    highlights: ["Every module", "Manage users & roles", "Edit business rules"],
  },
  Manager: {
    icon: UserCog,
    tagline: "Runs the floor, approvals, payroll and reporting",
    accent: "bg-primary/12 text-primary",
    ring: "ring-primary/20",
    landing: "/operations",
    highlights: ["Admin overview", "Approve leave & hours", "Finance reporting"],
  },
  Agent: {
    icon: Headphones,
    tagline: "Calling desk, customers, callbacks and own shift",
    accent: "bg-success/12 text-success",
    ring: "ring-success/20",
    landing: "/dashboard",
    highlights: ["Agent desk & dialer", "Customers & sales", "Own attendance only"],
  },
  "QA Analyst": {
    icon: ShieldCheck,
    tagline: "Scores recordings, raises and tracks escalations",
    accent: "bg-warning/12 text-warning",
    ring: "ring-warning/20",
    landing: "/qa",
    highlights: ["QA reviews", "Escalations & disputes", "Read-only sales"],
  },
  Developer: {
    icon: Code2,
    tagline: "Integrations, telephony sync and system health",
    accent: "bg-muted text-foreground",
    ring: "ring-border",
    landing: "/admin/health",
    highlights: ["Integrations & webhooks", "Telephony sync", "Audit & logs"],
  },
};

interface PermissionRow {
  group: string;
  module: string;
  path: string;
  allow: StaffRole[];
}

const PERMISSIONS: PermissionRow[] = [
  { group: "Command", module: "Admin Overview", path: "/operations", allow: ["Admin", "Manager"] },
  { group: "Command", module: "Dashboard", path: "/dashboard", allow: [...ROLE_ORDER] },
  {
    group: "Sales floor",
    module: "Agent Desk & Dialer",
    path: "/agent-desk",
    allow: ["Admin", "Manager", "Agent"],
  },
  {
    group: "Sales floor",
    module: "Customers & Sales",
    path: "/customers",
    allow: ["Admin", "Manager", "Agent", "QA Analyst"],
  },
  {
    group: "Sales floor",
    module: "Callbacks",
    path: "/callbacks",
    allow: ["Admin", "Manager", "Agent"],
  },
  {
    group: "Compliance",
    module: "DNC & Compliance",
    path: "/dnc",
    allow: ["Admin", "Manager", "Agent", "QA Analyst"],
  },
  {
    group: "Compliance",
    module: "QA Reviews",
    path: "/qa",
    allow: ["Admin", "Manager", "QA Analyst"],
  },
  {
    group: "Compliance",
    module: "Escalations",
    path: "/qa/escalations",
    allow: ["Admin", "Manager", "QA Analyst"],
  },
  {
    group: "People",
    module: "Attendance",
    path: "/attendance",
    allow: ["Admin", "Manager"],
  },
  { group: "People", module: "Leave", path: "/leave", allow: ["Admin", "Manager"] },
  { group: "Finance", module: "Overview", path: "/revenue", allow: ["Admin", "Manager"] },
  { group: "Finance", module: "Payroll", path: "/payroll", allow: ["Admin", "Manager"] },
  {
    group: "Finance",
    module: "Commissions",
    path: "/commissions",
    allow: ["Admin", "Manager", "Agent"],
  },
  { group: "Finance", module: "Expenses", path: "/expenses", allow: ["Admin", "Manager"] },
  { group: "Settings", module: "Users & Roles", path: "/admin/users", allow: ["Admin"] },
  { group: "Settings", module: "Business Rules", path: "/admin/rules", allow: ["Admin"] },
  {
    group: "Settings",
    module: "Phone System",
    path: "/admin/phone-system",
    allow: ["Admin", "Developer"],
  },
  {
    group: "Settings",
    module: "Telephony Sync",
    path: "/admin/telephony",
    allow: ["Admin", "Developer"],
  },
  {
    group: "Settings",
    module: "Integrations",
    path: "/admin/integrations",
    allow: ["Admin", "Developer"],
  },
  {
    group: "Settings",
    module: "System Health",
    path: "/admin/health",
    allow: ["Admin", "Developer"],
  },
  {
    group: "Settings",
    module: "Audit Logs",
    path: "/admin/audit",
    allow: ["Admin", "Manager", "Developer"],
  },
];

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  title: string;
  team: string;
  initials: string;
  active: boolean;
  lastActive: string;
}

const SEED_USERS: StaffUser[] = [
  {
    id: "u-1",
    name: "Priya Raman",
    email: "admin@policybear.com",
    role: "Admin",
    title: "System Administrator",
    team: "IT / Administration",
    initials: "PR",
    active: true,
    lastActive: "2 min ago",
  },
  {
    id: "u-2",
    name: "Owen Klein",
    email: "ceo@policybear.com",
    role: "Admin",
    title: "Chief Executive Officer",
    team: "Executive",
    initials: "OK",
    active: true,
    lastActive: "18 min ago",
  },
  {
    id: "u-3",
    name: "Marcus Hale",
    email: "operations@policybear.com",
    role: "Manager",
    title: "Operations Manager",
    team: "Floor Control",
    initials: "MH",
    active: true,
    lastActive: "Just now",
  },
  {
    id: "u-4",
    name: "Dana Reyes",
    email: "hr@policybear.com",
    role: "Manager",
    title: "HR Business Partner",
    team: "People Ops",
    initials: "DR",
    active: true,
    lastActive: "1 hr ago",
  },
  {
    id: "u-5",
    name: "Amelia Carter",
    email: "agent@policybear.com",
    role: "Agent",
    title: "Licensed Sales Agent",
    team: "Team Falcon",
    initials: "AC",
    active: true,
    lastActive: "Just now",
  },
  {
    id: "u-6",
    name: "Jordan Pike",
    email: "jordan.pike@policybear.com",
    role: "Agent",
    title: "Licensed Sales Agent",
    team: "Team Falcon",
    initials: "JP",
    active: true,
    lastActive: "5 min ago",
  },
  {
    id: "u-7",
    name: "Leo Whitaker",
    email: "qc@policybear.com",
    role: "QA Analyst",
    title: "Quality Control Lead",
    team: "QC Pod A",
    initials: "LW",
    active: true,
    lastActive: "26 min ago",
  },
  {
    id: "u-8",
    name: "Nadia Bloom",
    email: "accounting@policybear.com",
    role: "Manager",
    title: "Payroll & Commissions Analyst",
    team: "Finance",
    initials: "NB",
    active: true,
    lastActive: "3 hrs ago",
  },
  {
    id: "u-9",
    name: "Sam Ortega",
    email: "dev@policybear.com",
    role: "Developer",
    title: "Platform Engineer",
    team: "Engineering",
    initials: "SO",
    active: true,
    lastActive: "Yesterday",
  },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export function UsersRolesCenter() {
  const [users, setUsers] = useState<StaffUser[]>(SEED_USERS);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<StaffRole | "all">("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState<{ name: string; email: string; role: StaffRole }>({
    name: "",
    email: "",
    role: "Agent",
  });

  const counts = useMemo(() => {
    const map = new Map<StaffRole, number>(ROLE_ORDER.map((r) => [r, 0]));
    for (const u of users) map.set(u.role, (map.get(u.role) ?? 0) + 1);
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.team.toLowerCase().includes(q) ||
        u.title.toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter]);

  const groups = useMemo(() => {
    const out: { group: string; rows: PermissionRow[] }[] = [];
    for (const row of PERMISSIONS) {
      const last = out[out.length - 1];
      if (last && last.group === row.group) last.rows.push(row);
      else out.push({ group: row.group, rows: [row] });
    }
    return out;
  }, []);

  function changeRole(id: string, role: StaffRole) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    toast.success(`Role updated to ${role}`);
  }

  function toggleActive(id: string, active: boolean) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active } : u)));
    toast.success(active ? "Access restored" : "Access suspended");
  }

  function submitInvite() {
    const name = invite.name.trim();
    const email = invite.email.trim().toLowerCase();
    if (!name || !email.includes("@")) {
      toast.error("Add a full name and a valid email.");
      return;
    }
    setUsers((prev) => [
      {
        id: `u-${Date.now()}`,
        name,
        email,
        role: invite.role,
        title: invite.role,
        team: "Pending onboarding",
        initials: name
          .split(/\s+/)
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        active: true,
        lastActive: "Invited",
      },
      ...prev,
    ]);
    setInvite({ name: "", email: "", role: "Agent" });
    setInviteOpen(false);
    toast.success(`Invite sent to ${email}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        description="Five roles, one matrix. Invite staff, switch roles and suspend access instantly."
        eyebrow="Settings"
        actions={
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                Invite user
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite a user</DialogTitle>
                <DialogDescription>
                  They receive an email invite and land on their role&apos;s home screen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-name">Full name</Label>
                  <Input
                    id="invite-name"
                    value={invite.name}
                    onChange={(e) => setInvite((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Jamie Fox"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Work email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={invite.email}
                    onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))}
                    placeholder="jamie@policybear.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select
                    value={invite.role}
                    onValueChange={(v) => setInvite((p) => ({ ...p, role: v as StaffRole }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_ORDER.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_META[invite.role].tagline}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitInvite}>Send invite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Role cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ROLE_ORDER.map((role) => {
          const meta = ROLE_META[role];
          const Icon = meta.icon;
          const modules = PERMISSIONS.filter((p) => p.allow.includes(role)).length;
          const isFiltered = roleFilter === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(isFiltered ? "all" : role)}
              className={cn(
                "rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card",
                isFiltered && cn("ring-2", meta.ring),
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl",
                    meta.accent,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <Badge variant="secondary" className="shrink-0">
                  {counts.get(role) ?? 0} {(counts.get(role) ?? 0) === 1 ? "user" : "users"}
                </Badge>
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{role}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{meta.tagline}</p>
              <ul className="mt-3 space-y-1">
                {meta.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-1.5 text-[0.7rem] text-muted-foreground">
                    <Check className="mt-0.5 size-3 shrink-0 text-success" />
                    <span className="truncate">{h}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-border/70 pt-2 text-[0.7rem] text-muted-foreground">
                Lands on <span className="font-mono text-foreground">{meta.landing}</span> ·{" "}
                {modules} modules
              </p>
            </button>
          );
        })}
      </div>

      {/* Directory */}
      <Card className="gap-0 overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">User directory</p>
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {users.length} accounts
              {roleFilter !== "all" && ` · filtered to ${roleFilter}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, team"
                className="w-full pl-8 sm:w-64"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(v) => setRoleFilter(v as StaffRole | "all")}
            >
              <SelectTrigger className="w-[9.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLE_ORDER.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium">User</th>
                <th className="px-3 py-2 text-left font-medium">Team</th>
                <th className="px-3 py-2 text-left font-medium">Role</th>
                <th className="px-3 py-2 text-left font-medium">Last active</th>
                <th className="px-4 py-2 text-right font-medium">Access</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-[0.7rem]">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{user.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-xs text-foreground">{user.team}</p>
                    <p className="text-xs text-muted-foreground">{user.title}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <Select
                      value={user.role}
                      onValueChange={(v) => changeRole(user.id, v as StaffRole)}
                    >
                      <SelectTrigger className="h-8 w-[8.5rem] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_ORDER.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {user.lastActive}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant={user.active ? "secondary" : "outline"}>
                        {user.active ? "Active" : "Suspended"}
                      </Badge>
                      <Switch
                        checked={user.active}
                        onCheckedChange={(v) => toggleActive(user.id, v)}
                        aria-label={`Toggle access for ${user.name}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No users match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Permission matrix */}
      <Card className="gap-0 overflow-hidden p-0 shadow-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ShieldCheck className="size-4 text-brand" />
          <div>
            <p className="text-sm font-semibold text-foreground">Permission matrix</p>
            <p className="text-xs text-muted-foreground">
              What each role can open. Admin always has full access.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium">Module</th>
                {ROLE_ORDER.map((role) => (
                  <th key={role} className="px-3 py-2 text-center font-medium whitespace-nowrap">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <>
                  <tr key={group.group} className="bg-muted/25">
                    <td
                      colSpan={ROLE_ORDER.length + 1}
                      className="px-4 py-1.5 text-[0.65rem] font-medium tracking-[0.14em] uppercase text-muted-foreground"
                    >
                      {group.group}
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr
                      key={row.path}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-2">
                        <p className="font-medium text-foreground">{row.module}</p>
                        <p className="font-mono text-xs text-muted-foreground">{row.path}</p>
                      </td>
                      {ROLE_ORDER.map((role) => (
                        <td key={role} className="px-3 py-2 text-center">
                          {row.allow.includes(role) ? (
                            <Check className="mx-auto size-4 text-success" />
                          ) : (
                            <Minus className="mx-auto size-4 text-muted-foreground/35" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
