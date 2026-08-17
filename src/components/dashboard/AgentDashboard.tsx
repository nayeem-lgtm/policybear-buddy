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
import { notifications, shiftTimeline, tasks } from "@/lib/mock-data";
import {
  agentMetrics,
  formatHm,
  openCallbackQueue,
  resolveAgentName,
  commissionPerSaleLabel,
} from "@/lib/metrics-engine";
import { commissionPerSale, money } from "@/lib/company-data";

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

/* --------------------------------------------------------------------- view */

export function AgentDashboard({ name }: { name: string }) {
  const [selection, setSelection] = useState<DateSelection>({ preset: "today" });

  const agentName = useMemo(() => resolveAgentName(name), [name]);
  const m = useMemo(() => agentMetrics(agentName, selection), [agentName, selection]);

  const myCallbacks = useMemo(() => {
    const scoped = m.openCallbacks;
    const queue = scoped.length ? scoped : openCallbackQueue(agentName);
    return [...queue]
      .sort((a, b) =>
        a.status === "Overdue" ? -1 : b.status === "Overdue" ? 1 : a.scheduledFor.localeCompare(b.scheduledFor),
      )
      .slice(0, 6);
  }, [m.openCallbacks, agentName]);

  const myDisputes = useMemo(() => m.disputes.slice(0, 5), [m.disputes]);
  const myTasks = useMemo(() => tasks.filter((t) => t.status !== "Completed").slice(0, 5), []);
  const alerts = useMemo(() => notifications.slice(0, 5), []);
  const recentSales = useMemo(
    () => [...m.saleRows].sort((a, b) => b.saleDate.localeCompare(a.saleDate)).slice(0, 5),
    [m.saleRows],
  );

  const commissionLines = useMemo(() => {
    const rate = commissionPerSale(m.commission.eligibleSales);
    const incentives = m.commission.incentives;
    const chargebacks = m.saleRows.filter((s) =>
      ["Chargeback", "Cancelled", "Rejected"].includes(s.saleStatus ?? ""),
    ).length;
    return [
      {
        label: "Valid sales commission",
        detail: `${m.commission.eligibleSales} × ${money(rate)} (${commissionPerSaleLabel(rate)})`,
        amount: m.commission.commission,
      },
      {
        label: "Personal lead incentive",
        detail: "Self-generated business",
        amount: incentives,
      },
      {
        label: "Not commission eligible",
        detail: `${m.saleRows.filter((s) => !s.commissionEligible).length} sale(s) pending QC`,
        amount: 0,
      },
      {
        label: "Cancelled / chargeback",
        detail: `${chargebacks} policy(ies)`,
        amount: 0,
      },
    ];
  }, [m.commission, m.saleRows]);

  const commissionTotal = m.commission.total;
  const overdue = myCallbacks.filter((c) => ["Overdue", "Missed"].includes(c.status)).length;
  const talkGoalSeconds = 4 * 3600;
  const goals = [
    {
      label: "Submitted applications",
      value: Math.min(100, Math.round((m.sales.count / 6) * 100)),
      note: `${m.sales.count} of 6`,
    },
    {
      label: "Talk time target",
      value: Math.min(100, Math.round((m.calls.talkSeconds / talkGoalSeconds) * 100)),
      note: `${formatHm(m.calls.talkSeconds)} of 4h`,
    },
    {
      label: "Dials completed",
      value: Math.min(100, Math.round((m.calls.total / 50) * 100)),
      note: `${m.calls.total} of 50`,
    },
    {
      label: "Callbacks cleared",
      value: Math.round(m.callbacks.completionRate),
      note: `${m.callbacks.done} of ${m.callbacks.done + m.callbacks.open}`,
    },
  ];

  const attendance = [
    { label: "Hours paid", value: `${m.hoursWorked.toFixed(1)}h`, tone: "success" },
    { label: "Talk time", value: formatHm(m.calls.talkSeconds), tone: "brand" },
    { label: "Base pay", value: money(m.basePay), tone: "info" },
    { label: "Total pay", value: money(m.totalPay), tone: "success" },
  ] as { label: string; value: string; tone: string }[];


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
              <Trophy className="size-3.5 text-brand" /> Rank {m.rank} of {m.agentCount}
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
          value={String(m.sales.count)}
          hint={`${m.sales.issued} issued · ${m.commission.eligibleSales} commissionable`}
          tone="success"
          icon={<BadgeCheck className="size-4" />}
        />
        <StatCard
          label="Calls handled"
          value={String(m.calls.total)}
          hint={`${m.calls.outbound} outbound · ${m.calls.inbound} inbound`}
          tone="brand"
          icon={<PhoneCall className="size-4" />}
        />
        <StatCard
          label="Your commission"
          value={money(commissionTotal)}
          hint={`${presetLabel(selection)} · ${money(m.totalPay)} total pay`}
          tone="info"
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
        <StatCard label="Talk time" value={formatHm(m.calls.talkSeconds)} hint="Goal 4h" tone="info" icon={<Headphones className="size-4" />} />
        <StatCard
          label="Avg handle time"
          value={formatHm(m.calls.avgHandleSeconds)}
          hint={`${m.calls.paid} paid call(s)`}
          tone="success"
          icon={<Timer className="size-4" />}
        />
        <StatCard
          label="QA score"
          value={`${m.qaScore}%`}
          hint={`${m.disputes.length} open review(s)`}
          tone="brand"
          icon={<Target className="size-4" />}
        />
        <StatCard
          label="Conversion"
          value={`${m.conversion.toFixed(1)}%`}
          hint={`${m.sales.count} of ${m.calls.total} calls`}
          tone="warning"
        />
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
            <BarChart data={m.trend}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="sales" radius={[4, 4, 0, 0]} fill="var(--color-brand, #0247e2)" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Daily goals" hint="Resets at midnight">
          <div className="space-y-4 pt-1">
            {goals.map((g) => (
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
                  {l.amount < 0 ? "-" : ""}{money(Math.abs(l.amount))}
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Estimated payout
              </span>
              <span className="tabular font-display text-lg font-semibold text-success">
                {money(commissionTotal)}
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
              <div key={p.policyNumber || p.customer} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{p.customer}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.carrier} · {money(p.premium)}/mo · {p.saleDate}
                  </p>
                </div>
                <StatusBadge status={p.saleStatus ?? "Issued"} />
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
          <AreaChart data={m.trend}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" {...axis} />
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
