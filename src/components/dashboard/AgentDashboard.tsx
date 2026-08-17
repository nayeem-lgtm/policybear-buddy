import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Clock,
  DollarSign,
  Flame,
  Headphones,
  PhoneCall,
  PhoneOutgoing,
  ShieldAlert,
  Target,
  Timer,
  Trophy,
} from "lucide-react";

import { StatCard } from "@/components/crm/StatCard";
import { DateRangeTabs, presetLabel, type DateSelection } from "@/components/crm/DateRangeTabs";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  callbacks,
  notifications,
  policies,
  qaReviews,
  salesTrend,
  shiftTimeline,
  tasks,
} from "@/lib/mock-data";

/* --------------------------------------------------------------- primitives */

function Panel({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-3 p-4 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  );
}

const axis = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};

function Initials({ name, tone = "brand" }: { name: string; tone?: "brand" | "muted" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-xl text-[0.7rem] font-semibold",
        tone === "brand" ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground",
      )}
    >
      {initials}
    </span>
  );
}

/* ---------------------------------------------------------------- derived UI */

const URGENCY_TONE: Record<string, string> = {
  Urgent: "bg-destructive/12 text-destructive",
  High: "bg-warning/25 text-brand-tan",
  Normal: "bg-brand/10 text-brand",
  Low: "bg-muted text-muted-foreground",
};

const commissionLines = [
  { label: "Submitted applications", detail: "18 × $65", amount: 1170 },
  { label: "Effectuated bonus", detail: "9 × $40", amount: 360 },
  { label: "Retention bonus", detail: "Aug 1–15 cycle", amount: 220 },
  { label: "Chargeback clawback", detail: "1 policy", amount: -85 },
];

const attendance = [
  { label: "Sign-in", value: "07:02", tone: "success" as const },
  { label: "Talk time", value: "3h 12m", tone: "brand" as const },
  { label: "Break used", value: "16 / 15 min", tone: "danger" as const },
  { label: "Lunch used", value: "29 / 30 min", tone: "success" as const },
];

/* --------------------------------------------------------------------- view */

export function AgentDashboard({ name }: { name: string }) {
  const [selection, setSelection] = useState<DateSelection>({ preset: "today" });

  const myCallbacks = useMemo(
    () =>
      callbacks
        .filter((c) => c.status !== "Completed")
        .slice(0, 6)
        .sort((a, b) => (a.status === "Overdue" ? -1 : b.status === "Overdue" ? 1 : 0)),
    [],
  );

  const myDisputes = useMemo(
    () => qaReviews.filter((q) => q.outcome === "Disputed" || q.outcome === "Returned").slice(0, 5),
    [],
  );

  const myTasks = useMemo(() => tasks.filter((t) => t.status !== "Completed").slice(0, 5), []);
  const alerts = useMemo(() => notifications.slice(0, 5), []);
  const recentSales = useMemo(() => policies.slice(0, 5), []);

  const commissionTotal = commissionLines.reduce((sum, l) => sum + l.amount, 0);
  const overdue = myCallbacks.filter((c) => c.status === "Overdue").length;

  return (
    <div className="space-y-5">
      {/* hero */}
      <Card className="relative gap-0 overflow-hidden rounded-2xl border-border/70 p-5 shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand/10 via-transparent to-brand-cyan/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Initials name={name} />
            <div>
              <p className="font-display text-lg leading-tight font-semibold text-foreground">
                {name}
              </p>
              <p className="text-xs text-muted-foreground">
                Agent scorecard · shift started 07:02 · Team Falcon
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Flame className="size-3.5 text-warning" /> 5-day sales streak
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Trophy className="size-3.5 text-brand" /> Rank 3 of 24
            </Badge>
            <Button asChild size="sm">
              <Link to="/agent-desk">
                <PhoneOutgoing className="size-4" /> Open dialer
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* date range */}
      <Card className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-border/70 p-3 shadow-card">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Showing</span>
          <Badge variant="secondary" className="font-medium">{presetLabel(selection)}</Badge>
        </div>
        <DateRangeTabs value={selection} onChange={setSelection} />
      </Card>

      {/* headline stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sales you made"
          value="4"
          hint="18 this pay cycle"
          tone="success"
          delta={{ value: "+2 vs yesterday", direction: "up" }}
          icon={<BadgeCheck className="size-4" />}
        />
        <StatCard
          label="Calls handled today"
          value="38"
          hint="26 outbound · 12 inbound"
          tone="brand"
          delta={{ value: "+6", direction: "up" }}
          icon={<PhoneCall className="size-4" />}
        />
        <StatCard
          label="Your commission"
          value={`$${commissionTotal.toLocaleString()}`}
          hint="Aug 1–15 · pays Aug 20"
          tone="info"
          delta={{ value: "+$310", direction: "up" }}
          icon={<DollarSign className="size-4" />}
        />
        <StatCard
          label="Callbacks to do"
          value={String(myCallbacks.length)}
          hint={`${overdue} overdue`}
          tone={overdue ? "danger" : "warning"}
          icon={<CalendarClock className="size-4" />}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Talk time" value="3h 12m" hint="Goal 4h" tone="info" icon={<Headphones className="size-4" />} />
        <StatCard label="Avg handle time" value="4m 48s" hint="Floor avg 5m 20s" tone="success" icon={<Timer className="size-4" />} />
        <StatCard label="QA score" value="93%" hint={`${myDisputes.length} open reviews`} tone="brand" icon={<Target className="size-4" />} />
        <StatCard label="Conversion" value="10.5%" hint="4 of 38 calls" tone="warning" delta={{ value: "+1.4%", direction: "up" }} />
      </div>

      {/* performance + goals */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel
          title="Your submitted applications"
          hint="Last 7 days"
          className="lg:col-span-2"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/sales">
                View sales <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesTrend}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" {...axis} />
              <YAxis {...axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="sales" radius={[4, 4, 0, 0]} fill="var(--color-brand, #0247e2)" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Daily goals" hint="Resets at midnight">
          <div className="space-y-4 pt-1">
            {[
              { label: "Submitted applications", value: 68, note: "4 of 6" },
              { label: "Talk time target", value: 81, note: "3h 12m of 4h" },
              { label: "Dials completed", value: 76, note: "38 of 50" },
              { label: "Callbacks cleared", value: 45, note: "5 of 11" },
            ].map((g) => (
              <div key={g.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{g.label}</span>
                  <span className="tabular font-medium text-foreground">{g.note}</span>
                </div>
                <Progress value={g.value} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* callbacks + commission */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel
          title="Callback to-do"
          hint={`${overdue} overdue · ${myCallbacks.length} open`}
          className="lg:col-span-2"
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/callbacks">Callback book</Link>
            </Button>
          }
        >
          <div className="divide-y divide-border">
            {myCallbacks.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "flex items-center gap-3 py-2.5 first:pt-0 last:pb-0",
                  c.status === "Overdue" && "bg-destructive/5",
                )}
              >
                <Initials name={c.customer} tone={c.status === "Overdue" ? "brand" : "muted"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{c.customer}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.reason} · {c.scheduledFor} {c.timeZone}
                  </p>
                </div>
                <span
                  className={cn(
                    "hidden rounded-full px-2 py-0.5 text-[0.68rem] font-semibold sm:inline",
                    URGENCY_TONE[c.priority],
                  )}
                >
                  {c.priority}
                </span>
                <StatusBadge status={c.status} />
                <Button asChild variant="ghost" size="icon" className="size-8">
                  <Link to="/agent-desk" aria-label={`Call ${c.customer}`}>
                    <PhoneOutgoing className="size-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Commission breakdown" hint="Current pay cycle">
          <div className="space-y-2">
            {commissionLines.map((l) => (
              <div key={l.label} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{l.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.detail}</p>
                </div>
                <span
                  className={cn(
                    "tabular text-sm font-semibold",
                    l.amount < 0 ? "text-destructive" : "text-foreground",
                  )}
                >
                  {l.amount < 0 ? "-" : ""}${Math.abs(l.amount).toLocaleString()}
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Estimated payout
              </span>
              <span className="tabular font-display text-lg font-semibold text-success">
                ${commissionTotal.toLocaleString()}
              </span>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-1 w-full">
              <Link to="/commissions">Open commission statement</Link>
            </Button>
          </div>
        </Panel>
      </div>

      {/* QA + notifications */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="QA disputes & returned calls"
          hint={`${myDisputes.length} need your response`}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/qa/disputes">Open QA</Link>
            </Button>
          }
        >
          <div className="divide-y divide-border">
            {myDisputes.map((q) => (
              <div key={q.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
                  <ShieldAlert className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {q.callId} · {q.customer}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {q.reason} · reviewer {q.reviewer} · due {q.deadline}
                  </p>
                </div>
                <span className="tabular hidden text-xs text-muted-foreground sm:inline">
                  {q.score}%
                </span>
                <StatusBadge status={q.outcome} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Notifications" hint="Newest first" action={
          <Button asChild variant="ghost" size="sm">
            <Link to="/notifications">See all</Link>
          </Button>
        }>
          <div className="divide-y divide-border">
            {alerts.map((n) => (
              <div key={n.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.read ? "bg-border" : "bg-brand",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* tasks + sales + shift */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="My tasks" hint="Open items" action={
          <Button asChild variant="ghost" size="sm">
            <Link to="/tasks">Board</Link>
          </Button>
        }>
          <div className="divide-y divide-border">
            {myTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.recordType} · due {t.dueDate}
                  </p>
                </div>
                <StatusBadge status={t.priority} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Recent sales" hint="Your submissions" action={
          <Button asChild variant="ghost" size="sm">
            <Link to="/sales">All</Link>
          </Button>
        }>
          <div className="divide-y divide-border">
            {recentSales.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{p.customer}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.carrier} · {p.policyNumber}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Shift & attendance" hint="Today">
          <div className="grid grid-cols-2 gap-2">
            {attendance.map((a) => (
              <div key={a.label} className="rounded-xl border border-border/70 p-2.5">
                <p className="text-[0.65rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  {a.label}
                </p>
                <p
                  className={cn(
                    "tabular mt-1 text-sm font-semibold",
                    a.tone === "danger"
                      ? "text-destructive"
                      : a.tone === "success"
                        ? "text-success"
                        : "text-foreground",
                  )}
                >
                  {a.value}
                </p>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2">
            {shiftTimeline.slice(0, 5).map((s) => (
              <div key={`${s.time}-${s.event}`} className="flex items-start gap-2">
                <Clock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">
                    {s.time} · {s.event}
                  </p>
                  <p className="truncate text-[0.7rem] text-muted-foreground">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/my-shift">Open my shift</Link>
          </Button>
        </Panel>
      </div>

      {/* weekly trend */}
      <Panel title="Your call volume vs paid calls" hint="Last 7 days">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={salesTrend}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="day" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="calls"
              stroke="var(--color-brand, #0247e2)"
              fill="var(--color-brand, #0247e2)"
              fillOpacity={0.16}
            />
            <Area
              type="monotone"
              dataKey="paid"
              stroke="var(--color-brand-cyan, #67d9fd)"
              fill="var(--color-brand-cyan, #67d9fd)"
              fillOpacity={0.14}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
