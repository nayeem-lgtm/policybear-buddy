import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlarmClock,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  DollarSign,
  Headphones,
  PhoneCall,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { StatCard } from "@/components/crm/StatCard";
import { AgentDashboard } from "@/components/dashboard/AgentDashboard";

import { StatusBadge } from "@/components/crm/StatusBadge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/lib/mock-data";
import { callbacks, notifications, policies, salesTrend, revenueTrend, tasks } from "@/lib/mock-data";

/* ------------------------------------------------------------------ layout */

function Panel({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={"gap-3 p-4 shadow-card " + (className ?? "")}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </Card>
  );
}

function Rows({
  items,
}: {
  items: { primary: string; secondary?: string; right?: ReactNode }[];
}) {
  return (
    <div className="divide-y divide-border">
      {items.map((row, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{row.primary}</p>
            {row.secondary && (
              <p className="truncate text-xs text-muted-foreground">{row.secondary}</p>
            )}
          </div>
          {row.right && <div className="shrink-0 text-xs">{row.right}</div>}
        </div>
      ))}
    </div>
  );
}

const axis = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function tooltipStyle() {
  return {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
    color: "hsl(var(--popover-foreground))",
  };
}

function TrendChart({ kind }: { kind: "sales" | "revenue" | "calls" }) {
  if (kind === "revenue") {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={revenueTrend}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="month" {...axis} />
          <YAxis {...axis} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
          <Tooltip contentStyle={tooltipStyle()} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-brand, #0247e2)"
            fill="var(--color-brand, #0247e2)"
            fillOpacity={0.16}
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="var(--color-warning, #f3b53a)"
            fill="var(--color-warning, #f3b53a)"
            fillOpacity={0.12}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  if (kind === "calls") {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={salesTrend}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="day" {...axis} />
          <YAxis {...axis} />
          <Tooltip contentStyle={tooltipStyle()} />
          <Line type="monotone" dataKey="calls" stroke="var(--color-brand, #0247e2)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="paid" stroke="var(--color-brand-cyan, #67d9fd)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={salesTrend}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="day" {...axis} />
        <YAxis {...axis} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Bar dataKey="sales" radius={[4, 4, 0, 0]} fill="var(--color-brand, #0247e2)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------- role config */

interface Metric {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "brand" | "success" | "warning" | "danger" | "info";
  delta?: { value: string; direction: "up" | "down" };
  icon?: ReactNode;
}

interface RoleConfig {
  metrics: Metric[];
  chart: "sales" | "revenue" | "calls";
  chartTitle: string;
  panels: { title: string; hint?: string; rows: { primary: string; secondary?: string; right?: ReactNode }[] }[];
}

const taskRows = tasks.slice(0, 5).map((t) => ({
  primary: t.title,
  secondary: `${t.recordType} · due ${t.dueDate}`,
  right: <StatusBadge status={t.priority} />,
}));

const alertRows = notifications.slice(0, 5).map((n) => ({
  primary: n.title,
  secondary: n.body,
  right: <span className="text-muted-foreground">{n.time}</span>,
}));

const CONFIGS: Record<Role, RoleConfig> = {
  Agent: {
    metrics: [
      { label: "My calls today", value: "38", tone: "brand", delta: { value: "+6", direction: "up" }, icon: <PhoneCall className="size-4" /> },
      { label: "Talk time", value: "3h 12m", hint: "Goal 4h", tone: "info", icon: <Headphones className="size-4" /> },
      { label: "Submitted apps", value: "4", tone: "success", delta: { value: "+2", direction: "up" }, icon: <BadgeCheck className="size-4" /> },
      { label: "Callbacks due", value: "7", hint: "3 overdue", tone: "warning", icon: <CalendarClock className="size-4" /> },
    ],
    chart: "sales",
    chartTitle: "My submitted applications this week",
    panels: [
      {
        title: "Next callbacks",
        hint: "Today",
        rows: callbacks.slice(0, 5).map((c) => ({
          primary: c.customer,
          secondary: `${c.scheduledFor} · ${c.reason}`,
          right: <StatusBadge status={c.status} />,
        })),
      },
      { title: "My tasks", rows: taskRows },
    ],
  },
  QC: {
    metrics: [
      { label: "Calls in review queue", value: "46", tone: "brand", icon: <Headphones className="size-4" /> },
      { label: "Avg QA score", value: "91%", tone: "success", delta: { value: "+2%", direction: "up" }, icon: <ShieldCheck className="size-4" /> },
      { label: "Open disputes", value: "5", tone: "warning" },
      { label: "Failed calls today", value: "3", tone: "danger" },
    ],
    chart: "calls",
    chartTitle: "Reviewed vs paid calls",
    panels: [
      {
        title: "Awaiting scoring",
        hint: "Oldest first",
        rows: policies.slice(0, 5).map((p) => ({
          primary: `${p.customer} · ${p.carrier}`,
          secondary: `${p.policyNumber} · ${p.agent}`,
          right: <Badge variant="secondary">Pending QC</Badge>,
        })),
      },
      { title: "QC alerts", rows: alertRows },
    ],
  },
  HR: {
    metrics: [
      { label: "Signed in now", value: "21 / 24", tone: "success", icon: <UserCheck className="size-4" /> },
      { label: "Late arrivals", value: "3", tone: "warning", icon: <AlarmClock className="size-4" /> },
      { label: "Break overruns", value: "5", tone: "danger" },
      { label: "Leave requests", value: "4", hint: "Awaiting review", tone: "brand", icon: <ClipboardList className="size-4" /> },
    ],
    chart: "calls",
    chartTitle: "Floor coverage this week",
    panels: [
      {
        title: "Attendance exceptions",
        hint: "Today",
        rows: [
          { primary: "Late sign-in — 07:19", secondary: "Amelia Carter · 19 min after shift start", right: <StatusBadge status="Late" /> },
          { primary: "Break overrun — 4 min", secondary: "Devon Price · 15 min allowance", right: <StatusBadge status="Overrun" /> },
          { primary: "Lunch overrun — 7 min", secondary: "Kiara Nunez · 30 min allowance", right: <StatusBadge status="Overrun" /> },
          { primary: "Missing sign-out", secondary: "Owen Barrera · auto-closed 16:04", right: <StatusBadge status="Auto Closed" /> },
          { primary: "Early sign-out — 15:32", secondary: "Marisol Vega", right: <StatusBadge status="Early Out" /> },
        ],
      },
      {
        title: "Onboarding & training",
        rows: [
          { primary: "Compliant Call Openings", secondary: "6 agents in progress", right: <span className="text-muted-foreground">72%</span> },
          { primary: "New hire onboarding email series", secondary: "2 employees in day 3", right: <Badge variant="secondary">Running</Badge> },
          { primary: "HIPAA refresher exam", secondary: "Due Aug 15", right: <span className="text-muted-foreground">41%</span> },
          { primary: "Shift policy acknowledgement", secondary: "18 of 24 signed", right: <span className="text-muted-foreground">75%</span> },
        ],
      },
    ],
  },
  Accounting: {
    metrics: [
      { label: "Revenue MTD", value: "$291,400", tone: "success", delta: { value: "+8.6%", direction: "up" }, icon: <DollarSign className="size-4" /> },
      { label: "Cost MTD", value: "$158,200", tone: "warning", icon: <TrendingUp className="size-4" /> },
      { label: "Commissions payable", value: "$42,180", tone: "brand" },
      { label: "Open chargebacks", value: "12", hint: "$4,120 exposure", tone: "danger" },
    ],
    chart: "revenue",
    chartTitle: "Revenue vs cost trend",
    panels: [
      {
        title: "Pending approvals",
        rows: [
          { primary: "Commission adjustment — POL-7412", secondary: "Requested by Nadia Bloom", right: <span className="text-muted-foreground">$185.00</span> },
          { primary: "Chargeback write-off — POL-7440", secondary: "Requested by Nadia Bloom", right: <span className="text-muted-foreground">$620.00</span> },
          { primary: "Overtime approval — Team Charlie", secondary: "Requested by Marcus Hale", right: <span className="text-muted-foreground">$412.00</span> },
          { primary: "CallTools seat invoice", secondary: "24 seats · weekly", right: <span className="text-muted-foreground">$830.88</span> },
        ],
      },
      { title: "Cost centers", rows: [
        { primary: "Ringba / CallGrid media", secondary: "Traffic spend", right: <span className="text-muted-foreground">$78,400</span> },
        { primary: "Gusto payroll & taxes", secondary: "Aug 1–15 cycle", right: <span className="text-muted-foreground">$54,210</span> },
        { primary: "Commissions & incentives", secondary: "Accrued", right: <span className="text-muted-foreground">$21,060</span> },
        { primary: "CallTools seats", secondary: "Monthly", right: <span className="text-muted-foreground">$3,600</span> },
      ] },
    ],
  },
  Operations: {
    metrics: [
      { label: "Agents available", value: "16", hint: "of 24 signed in", tone: "success", icon: <Users className="size-4" /> },
      { label: "Calls in progress", value: "9", tone: "brand", icon: <PhoneCall className="size-4" /> },
      { label: "Break overruns", value: "5", tone: "danger", icon: <AlarmClock className="size-4" /> },
      { label: "Sales today", value: "22", tone: "info", delta: { value: "+4", direction: "up" } },
    ],
    chart: "calls",
    chartTitle: "Call volume vs paid calls",
    panels: [
      {
        title: "Floor status",
        hint: "Live",
        rows: [
          { primary: "Available", secondary: "Ready for calls", right: <Badge variant="secondary">16</Badge> },
          { primary: "On call", secondary: "Connected now", right: <Badge variant="secondary">9</Badge> },
          { primary: "Break", secondary: "1 over allowance", right: <Badge variant="secondary">3</Badge> },
          { primary: "Lunch", secondary: "30 min allowance", right: <Badge variant="secondary">2</Badge> },
          { primary: "Meeting / training", secondary: "Coaching pod", right: <Badge variant="secondary">2</Badge> },
        ],
      },
      { title: "Operations alerts", rows: alertRows },
    ],
  },
  Administrator: {
    metrics: [
      { label: "Active users", value: "24", tone: "brand", icon: <Users className="size-4" /> },
      { label: "Integrations healthy", value: "5 / 6", tone: "success", icon: <ShieldCheck className="size-4" /> },
      { label: "Sync errors 24h", value: "2", tone: "warning" },
      { label: "API calls 24h", value: "18,402", tone: "info" },
    ],
    chart: "calls",
    chartTitle: "Platform activity",
    panels: [
      {
        title: "Integration health",
        rows: [
          { primary: "CallTools", secondary: "Last sync 4 min ago", right: <StatusBadge status="Connected" /> },
          { primary: "CallGrid", secondary: "Last sync 6 min ago", right: <StatusBadge status="Connected" /> },
          { primary: "Gusto", secondary: "Manual import", right: <Badge variant="secondary">Manual</Badge> },
          { primary: "Email / OTP bot", secondary: "2 retries", right: <StatusBadge status="Degraded" /> },
        ],
      },
      { title: "Recent audit events", rows: alertRows },
    ],
  },
  CEO: {
    metrics: [
      { label: "Revenue MTD", value: "$291,400", tone: "success", delta: { value: "+8.6%", direction: "up" }, icon: <DollarSign className="size-4" /> },
      { label: "Net margin", value: "45.7%", tone: "brand", delta: { value: "+1.9%", direction: "up" } },
      { label: "Sales this week", value: "108", tone: "info", icon: <BadgeCheck className="size-4" /> },
      { label: "Floor attendance", value: "88%", hint: "21 of 24", tone: "warning", icon: <UserCheck className="size-4" /> },
    ],
    chart: "revenue",
    chartTitle: "Revenue vs cost trend",
    panels: [
      {
        title: "Department snapshot",
        rows: [
          { primary: "Sales Floor", secondary: "22 sales today · 91% QA", right: <StatusBadge status="On Track" /> },
          { primary: "Quality Control", secondary: "46 in queue · 5 disputes", right: <StatusBadge status="Watch" /> },
          { primary: "Human Resources", secondary: "3 late · 4 leave requests", right: <StatusBadge status="On Track" /> },
          { primary: "Accounting", secondary: "$42.2k commissions payable", right: <StatusBadge status="On Track" /> },
          { primary: "Traffic", secondary: "CPS $41.80 · 12 publishers", right: <StatusBadge status="Watch" /> },
        ],
      },
      { title: "Executive alerts", rows: alertRows },
    ],
  },
};

/* -------------------------------------------------------------------- view */

export function RoleDashboard({ role, name }: { role: Role; name: string }) {
  const [period, setPeriod] = useState("today");
  const [team, setTeam] = useState("all");
  const [view, setView] = useState<"role" | "agent">(role === "Agent" ? "agent" : "role");
  const config = useMemo(() => CONFIGS[role] ?? CONFIGS.Agent, [role]);

  const viewSwitch = role === "Agent" ? null : (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      <button
        type="button"
        onClick={() => setView("role")}
        className={
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
          (view === "role" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground")
        }
      >
        {role} view
      </button>
      <button
        type="button"
        onClick={() => setView("agent")}
        className={
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
          (view === "agent" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground")
        }
      >
        Agent scorecard
      </button>
    </div>
  );

  if (view === "agent") {
    return (
      <div className="space-y-4">
        {viewSwitch && <div className="flex justify-end">{viewSwitch}</div>}
        <AgentDashboard name={name} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {name} · <span className="text-foreground">{role}</span> view · placeholder data
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {viewSwitch}

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="quarter">This quarter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              <SelectItem value="falcon">Team Falcon</SelectItem>
              <SelectItem value="alpha">Team Alpha</SelectItem>
              <SelectItem value="charlie">Team Charlie</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title={config.chartTitle} hint="Last 7 days" className="lg:col-span-2">
          <TrendChart kind={config.chart} />
        </Panel>
        <Panel title="Daily goal progress" hint="Placeholder">
          <div className="space-y-4 pt-1">
            {[
              { label: "Submitted applications", value: 68 },
              { label: "Talk time target", value: 81 },
              { label: "QA pass rate", value: 91 },
              { label: "Attendance compliance", value: 88 },
            ].map((g) => (
              <div key={g.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{g.label}</span>
                  <span className="tabular font-medium text-foreground">{g.value}%</span>
                </div>
                <Progress value={g.value} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {config.panels.map((p) => (
          <Panel key={p.title} title={p.title} {...(p.hint ? { hint: p.hint } : {})}>
            <Rows items={p.rows} />
          </Panel>
        ))}
      </div>
    </div>
  );
}
