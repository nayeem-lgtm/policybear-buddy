import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  PhoneCall,
  PhoneForwarded,
  Activity,
  HeartPulse,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
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

import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DateRangeTabs, presetLabel, type DateSelection } from "@/components/crm/DateRangeTabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

import { selectionBounds } from "@/lib/date-range";
import { sales, payrollWeeks } from "@/lib/company-data";
import { attendanceExceptions, hourRequests, leaveRequestsHr } from "@/lib/hr-data";
import { calls, callbacks, employees, qaReviews } from "@/lib/mock-data";
import {
  agentMetrics,
  companyMetrics,
  financeMetrics,
  openCallbackQueue,
} from "@/lib/metrics-engine";
import { useExpenseLedger, isManualExpense } from "@/lib/expense-store";

/** Shared table chrome so every admin table scans identically. */
const THEAD_ROW =
  "sticky top-0 z-10 border-b border-border bg-muted/60 text-left text-[0.66rem] font-semibold tracking-[0.09em] text-muted-foreground uppercase backdrop-blur";
const TABLE = "w-full min-w-[760px] text-sm";

function SectionHead({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className="shrink-0">{icon}</span>}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</p>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const money2 = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Days covered by the current selection — drives how much demo data is in view. */
function rangeDays(sel: DateSelection) {
  const { from, to } = selectionBounds(sel);
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

/**
 * Demo datasets carry fixed historic timestamps, so instead of dropping every
 * row outside the window we scale the cohort with the window length. Swap this
 * for a real range query when the reporting API is wired up.
 */
function cohort<T>(rows: T[], sel: DateSelection) {
  const days = rangeDays(sel);
  const share = Math.min(1, 0.16 + days * 0.055);
  return rows.slice(0, Math.max(1, Math.round(rows.length * share)));
}

export function AdminCommandCenter() {
  const [sel, setSel] = useState<DateSelection>({ preset: "today" });
  const [handled, setHandled] = useState<Record<string, "approved" | "denied">>({});
  const navigate = useNavigate();
  const go = (to: string) => navigate({ to: to as never });

  const label = presetLabel(sel);

  const expenseLedger = useExpenseLedger();
  const manualExpenseTotal = useMemo(
    () =>
      expenseLedger
        .filter((e) => isManualExpense(e.id))
        .reduce((sum, e) => sum + (e.amount || 0), 0),
    [expenseLedger],
  );

  const view = useMemo(() => {
    const m = companyMetrics(sel);
    return {
      salesRows: m.saleRows,
      callRows: m.callRows,
      qaRows: m.qaRows,
      premium: m.sales.premium,
      policyAmount: m.sales.policyAmount,
      carrierRevenue: m.sales.carrierRevenue,
      receivable: m.sales.receivable,
      validSales: m.sales.validSales,
      commission: m.commission.total,
      paidCalls: m.calls.paid,
      qaIssues: m.qaRows.filter((r) =>
        ["Invalid", "Returned", "Disputed"].includes(r.outcome),
      ),
      avgQa: m.qa.avgScore,
      openCallbacks: openCallbackQueue(),
      doneCallbacks: m.callbackRows.filter((c) => c.status === "Completed"),
      overdueCallbacks: openCallbackQueue().filter((c) =>
        ["Overdue", "Missed"].includes(c.status),
      ),
      trend: m.trend.map((d) => ({
        day: d.label,
        calls: d.calls,
        paid: d.paid,
        sales: d.sales,
      })),
      metrics: m,
    };
  }, [sel]);

  /* ------------------------------------------------------------------ finance */
  const finance = useMemo(() => {
    const f = financeMetrics(sel, manualExpenseTotal);
    const weeks = [...new Set(payrollWeeks.map((w) => w.weekStart))].sort();
    const nextWeek = weeks[weeks.length - 1] ?? "";
    const nextRows = payrollWeeks.filter((w) => w.weekStart === nextWeek);
    const nextBase = nextRows.reduce((s, w) => s + (w.basePayroll || 0), 0);
    const nextCommission = nextRows.reduce(
      (s, w) => s + (w.commissionDue || 0) + (w.incentiveDue || 0),
      0,
    );
    const saleCount = view.salesRows.length;
    const callCount = view.callRows.length;
    return {
      revenue: f.revenueCollected,
      booked: f.revenueBooked,
      receivable: f.receivable,
      cost: f.totalCost,
      net: f.netProfit,
      netProjected: f.netProjected,
      premiumWritten: f.premiumWritten,
      commissionDue: f.commission,
      basePayroll: f.basePayroll,
      traffic: f.trafficCost,
      seats: f.seatCost,
      expenses: f.trafficCost + f.seatCost + f.otherCost + f.manualExpenses,
      margin: f.margin,
      revenuePerSale: saleCount ? f.revenueBooked / saleCount : 0,
      revenuePerCall: callCount ? f.revenueBooked / callCount : 0,
      payoutRatio: f.revenueBooked ? (f.totalCost / f.revenueBooked) * 100 : 0,
      nextWeek,
      nextRows,
      nextBase,
      nextCommission,
      nextTotal: nextBase + nextCommission,
    };
  }, [sel, manualExpenseTotal, view.salesRows.length, view.callRows.length]);


  /* ------------------------------------------------------------- agent scores */
  const scoreboard = useMemo(() => {
    const names = [
      ...new Set([
        ...view.callRows.map((c) => c.agent),
        ...view.salesRows.map((s) => s.agent),
      ]),
    ];
    return names
      .map((name) => {
        const a = agentMetrics(name, sel);
        return {
          name,
          calls: a.calls.total,
          sales: a.sales.count,
          conv: Math.round(a.conversion),
          score: a.qaScore,
          cbDone: a.callbacks.done,
          cbTodo: openCallbackQueue(name).length,
          commission: a.commission.total,
        };
      })
      .sort((a, b) => b.sales - a.sales || b.score - a.score);
  }, [sel, view.callRows, view.salesRows]);

  /* -------------------------------------------------------------- agent health */
  const agentHealth = useMemo(() => {
    const agents = employees.filter((e) => e.role === "Agent");
    const alerts = employees.filter((e) => e.alert);
    const signedIn = agents.filter((e) => e.status !== "Signed Out");
    const onBreak = agents.filter((e) => /break|lunch/i.test(e.status));
    const cbDue = agents.reduce((sum, e) => sum + (e.callbacksDue || 0), 0);
    const postCall = agents.reduce((sum, e) => sum + (e.postCallPending || 0), 0);
    const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
    return {
      alerts,
      signals: [
        {
          label: "Signed in",
          value: `${signedIn.length}/${agents.length}`,
          pct: pct(signedIn.length, agents.length),
          hint: "Agents currently on the floor",
          to: "/live-operations",
        },
        {
          label: "On break / lunch",
          value: `${onBreak.length}`,
          pct: pct(onBreak.length, Math.max(1, agents.length)),
          hint: "Watch for extended breaks",
          to: "/break-alarm",
        },
        {
          label: "Callbacks due",
          value: `${cbDue}`,
          pct: Math.min(100, cbDue * 4),
          hint: "Across every agent queue",
          to: "/callbacks",
        },
        {
          label: "Post-call pending",
          value: `${postCall}`,
          pct: Math.min(100, postCall * 6),
          hint: "Wrap-ups not yet submitted",
          to: "/tasks",
        },
        {
          label: "Alert load",
          value: `${alerts.length}`,
          pct: pct(alerts.length, Math.max(1, employees.length)),
          hint: "Live coaching interventions needed",
          to: "/live-operations",
        },
      ],
    };
  }, []);

  /* ---------------------------------------------------------------- approvals */
  const pendingLeave = leaveRequestsHr.filter(
    (l) => l.status === "Pending" && !handled[l.id],
  );
  const pendingHours = hourRequests.filter(
    (h) => h.status === "Pending" && !handled[h.id],
  );
  const onLeaveNow = leaveRequestsHr.filter((l) => l.status === "Approved");
  const lateAttendance = attendanceExceptions.filter((e) =>
    ["Late Sign-In", "Missed Sign-Out", "Unpaid Absence"].includes(e.type),
  );

  const decide = (id: string, verdict: "approved" | "denied", who: string) => {
    setHandled((prev) => ({ ...prev, [id]: verdict }));
    toast.success(`${verdict === "approved" ? "Approved" : "Denied"} — ${who}`);
  };

  const todoCount = pendingLeave.length + pendingHours.length + view.qaIssues.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <BadgeCheck className="size-4 shrink-0 text-brand" />
          <span className="truncate">
            Showing <span className="font-semibold text-foreground">{label}</span> across the
            whole company
          </span>
        </div>
        <div className="overflow-x-auto">
          <DateRangeTabs value={sel} onChange={setSel} />
        </div>
      </div>

      {/* headline metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Calls received"
          value={view.callRows.length}
          hint={`${view.paidCalls} billable`}
          tone="brand"
          to="/calls"
          icon={<PhoneCall className="size-4" />}
        />
        <StatCard
          label="Sales done"
          value={view.salesRows.length}
          hint={`${view.validSales} valid · ${money(view.premium)} premium`}
          tone="success"
          to="/customers"
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Escalations raised"
          value={view.qaIssues.length}
          hint={`Avg QA score ${view.avgQa} · open escalations`}
          tone="danger"
          to="/qa/escalations"
          icon={<ShieldAlert className="size-4" />}
        />
        <StatCard
          label="Commission earned"
          value={money(view.commission)}
          hint={`${view.salesRows.filter((s) => s.commissionEligible).length} eligible sales`}
          tone="warning"
          to="/commissions"
          icon={<Banknote className="size-4" />}
        />
        <StatCard
          label="Agent production"
          value={money(view.policyAmount)}
          hint="Face amount written"
          tone="info"
          to="/revenue"
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label="Callbacks open"
          value={view.openCallbacks.length}
          hint={`${view.overdueCallbacks.length} overdue · ${view.doneCallbacks.length} done`}
          tone={view.overdueCallbacks.length ? "danger" : "info"}
          to="/callbacks"
          icon={<PhoneForwarded className="size-4" />}
        />
        <StatCard
          label="Agents on leave"
          value={onLeaveNow.length}
          hint={onLeaveNow.map((l) => l.employee.split(" ")[0]).join(", ") || "Full floor"}
          tone="warning"
          to="/leave"
          icon={<CalendarClock className="size-4" />}
        />
        <StatCard
          label="Admin to-dos"
          value={todoCount}
          hint={`${pendingLeave.length} leave · ${pendingHours.length} hours · ${view.qaIssues.length} QA`}
          tone={todoCount ? "danger" : "success"}
          to="/leave"
          icon={<ClipboardCheck className="size-4" />}
        />
      </div>

      {/* financial summary — full P&L position, same date window */}
      <Card className="rounded-2xl border-border/70 p-5 shadow-card">
        <SectionHead
          icon={<Banknote className="size-4 text-brand" />}
          title="Financial summary"
          subtitle={`${label} · revenue, payout, profit and commission position`}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/revenue">
                Finance overview <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total revenue"
            value={money(finance.revenue)}
            hint={`${money(finance.booked)} booked with carriers`}
            tone="success"
            to="/revenue"
            icon={<TrendingUp className="size-4" />}
          />
          <StatCard
            label="Total payout"
            value={money(finance.cost)}
            hint={`Payroll ${money(finance.basePayroll)} · commission ${money(finance.commissionDue)}`}
            tone="warning"
            to="/payroll"
            icon={<Wallet className="size-4" />}
          />
          <StatCard
            label="Net profit"
            value={money(finance.net)}
            hint={`Margin ${finance.margin.toFixed(1)}% · projected ${money(finance.netProjected)}`}
            tone={finance.net >= 0 ? "success" : "danger"}
            to="/expenses"
            icon={<Activity className="size-4" />}
          />
          <StatCard
            label="Commission earned"
            value={money(view.commission)}
            hint="Agent commission + incentives in range"
            tone="brand"
            to="/commissions"
            icon={<Banknote className="size-4" />}
          />
          <StatCard
            label="Carrier commission"
            value={money(view.carrierRevenue)}
            hint="Advance booked on written business"
            tone="info"
            to="/revenue"
            icon={<CreditCard className="size-4" />}
          />
          <StatCard
            label="Receivable commission"
            value={money(finance.receivable)}
            hint="Awaiting carrier settlement"
            tone="warning"
            to="/call-reconciliation"
            icon={<Clock className="size-4" />}
          />
          <StatCard
            label="Premium written"
            value={money(view.premium)}
            hint={`${money(view.policyAmount)} face amount`}
            tone="brand"
            to="/customers"
            icon={<CheckCircle2 className="size-4" />}
          />
          <StatCard
            label="Operating expenses"
            value={money(finance.expenses)}
            hint={`Traffic ${money(finance.traffic)} · seats ${money(finance.seats)}`}
            tone="danger"
            to="/expenses"
            icon={<AlertTriangle className="size-4" />}
          />
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/25 p-4">
            <p className="text-[0.68rem] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
              Money in
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Revenue collected", money2(finance.revenue)],
                ["Revenue booked", money2(finance.booked)],
                ["Receivable from carriers", money2(finance.receivable)],
                ["Premium written", money2(view.premium)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="tabular font-semibold text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-muted/25 p-4">
            <p className="text-[0.68rem] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
              Money out
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Base payroll", money2(finance.basePayroll)],
                ["Agent commission", money2(finance.commissionDue)],
                ["Call traffic", money2(finance.traffic)],
                ["Seats & tooling", money2(finance.seats)],
                ["Manual expenses", money2(manualExpenseTotal)],
                ["Total payout", money2(finance.cost)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="tabular font-semibold text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-gradient-to-br from-brand/10 to-transparent p-4">
            <p className="text-[0.68rem] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
              Bottom line
            </p>
            <p
              className={`tabular mt-3 font-display text-3xl font-semibold ${
                finance.net >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {money2(finance.net)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Net profit on collected revenue · margin {finance.margin.toFixed(1)}%
            </p>
            <Separator className="my-3" />
            <dl className="space-y-2 text-sm">
              {[
                ["Projected net (booked)", money2(finance.netProjected)],
                ["Revenue per sale", money2(finance.revenuePerSale)],
                ["Revenue per call", money2(finance.revenuePerCall)],
                ["Payout ratio", `${finance.payoutRatio.toFixed(1)}%`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="tabular font-semibold text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Card>

      {/* platform summary A→Z */}
      <Card className="rounded-2xl border-border/70 p-5 shadow-card">
        <SectionHead
          icon={<Activity className="size-4 text-brand" />}
          title="Platform summary"
          subtitle={`${label} · every desk on one line — click any tile to drill in`}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {platformSummary.map((group) => (
            <div key={group.title} className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-[0.68rem] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
                {group.title}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                {group.rows.map((row) => (
                  <button
                    key={row.label}
                    type="button"
                    onClick={() => go(row.to)}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent/50"
                  >
                    <dt className="truncate text-muted-foreground">{row.label}</dt>
                    <dd className="tabular shrink-0 font-semibold text-foreground">{row.value}</dd>
                  </button>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Card>



      {/* charts + approvals */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-2xl border-border/70 p-5 shadow-card xl:col-span-2">
          <SectionHead
            icon={<TrendingUp className="size-4 text-brand" />}
            title="Call & sale flow"
            subtitle={`${label} · billable vs total volume`}
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/reporting">
                  Full report <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            }
          />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={view.trend}>
                <defs>
                  <linearGradient id="adminCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} width={28} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="var(--brand)"
                  fill="url(#adminCalls)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="paid"
                  stroke="var(--success)"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Separator className="my-3" />
          <div className="h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={view.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="sales" fill="var(--brand)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/70 p-5 shadow-card">
          <SectionHead
            icon={<ClipboardCheck className="size-4 text-brand" />}
            title="Needs your approval"
            subtitle="Leave, extra hours and QA escalations"
            action={
              <StatusBadge status={`${todoCount} open`} tone={todoCount ? "warning" : "success"} />
            }
          />
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-2">
              {pendingLeave.map((l) => (
                <div key={l.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{l.employee}</p>
                    <StatusBadge status={l.type} tone="info" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.startDate} → {l.endDate} · {l.days}d · balance {l.balanceRemaining}d
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{l.reason}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => decide(l.id, "approved", l.employee)}>
                      <CheckCircle2 className="mr-1 size-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => decide(l.id, "denied", l.employee)}
                    >
                      Deny
                    </Button>
                  </div>
                </div>
              ))}

              {pendingHours.map((h) => (
                <div key={h.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{h.employee}</p>
                    <StatusBadge status={h.type} tone="brand" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {h.date} · {h.requestedHours}h · cost {money2(h.costImpact)}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{h.reason}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => decide(h.id, "approved", h.employee)}>
                      <CheckCircle2 className="mr-1 size-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => decide(h.id, "denied", h.employee)}
                    >
                      Deny
                    </Button>
                  </div>
                </div>
              ))}

              {view.qaIssues.slice(0, 6).map((q) => (
                <div key={q.id} className="rounded-xl border border-destructive/25 bg-destructive/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{q.agent}</p>
                    <StatusBadge status={q.outcome} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q.callId} · {q.reason} · score {q.score}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-2 h-7 px-2 text-xs">
                    <Link to="/qa/escalations">Open escalation</Link>
                  </Button>
                </div>
              ))}

              {todoCount === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nothing waiting on you. Nice.
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* agent health */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-2xl border-border/70 p-5 shadow-card xl:col-span-2">
          <SectionHead
            icon={<HeartPulse className="size-4 text-destructive" />}
            title="Agent health — active alerts"
            subtitle={`${agentHealth.alerts.length} live alert${agentHealth.alerts.length === 1 ? "" : "s"} on the floor`}
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/live-operations">
                  Live floor <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            }
          />
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-2">
              {agentHealth.alerts.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Every agent is healthy right now.
                </p>
              )}
              {agentHealth.alerts.map((e) => (
                <Link
                  key={e.id}
                  to="/live-operations"
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-destructive/40 hover:bg-destructive/5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-[0.7rem] font-semibold text-brand">
                      {e.avatarInitials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{e.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.team} · {e.status} · {e.callsToday} calls · {e.callbacksDue} callbacks due
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={e.alert ?? "Alert"} tone="danger" />
                </Link>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="rounded-2xl border-border/70 p-5 shadow-card">
          <SectionHead
            icon={<Activity className="size-4 text-brand" />}
            title="Health signals"
            subtitle="Floor coverage and workload pressure"
          />
          <div className="space-y-3">
            {agentHealth.signals.map((sig) => (
              <Link
                key={sig.label}
                to={sig.to as never}
                className="block rounded-xl border border-border p-3 transition-colors hover:border-brand/40 hover:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                    {sig.label}
                  </p>
                  <span className="tabular text-sm font-semibold text-foreground">{sig.value}</span>
                </div>
                <Progress value={sig.pct} className="mt-2 h-1.5" />
                <p className="mt-1 text-xs text-muted-foreground">{sig.hint}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>


      {/* tabs: agents / finance / people */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="agents">Agent scoreboard</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="people">People & attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <Card className="overflow-hidden rounded-2xl border-border/70 shadow-card">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 sm:flex sm:justify-between">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                Agent performance — {label}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/employees">All employees</Link>
              </Button>
            </div>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className="px-4 py-2.5">Agent</th>
                    <th className="px-3 py-2.5">Calls</th>
                    <th className="px-3 py-2.5">Sales</th>
                    <th className="px-3 py-2.5">Conv.</th>
                    <th className="px-3 py-2.5 min-w-[160px]">QA score</th>
                    <th className="px-3 py-2.5">Callbacks done</th>
                    <th className="px-3 py-2.5">Callbacks to-do</th>
                    <th className="px-3 py-2.5 text-right">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreboard.map((row) => (
                    <tr
                      key={row.name}
                      onClick={() => go("/employees")}
                      className="cursor-pointer border-b border-border/60 last:border-0 transition-colors hover:bg-accent/40"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-[0.7rem] font-semibold text-brand">
                            {row.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                          </span>
                          <span className="font-medium text-foreground">{row.name}</span>
                        </div>
                      </td>
                      <td className="tabular px-3 py-2.5">{row.calls}</td>
                      <td className="tabular px-3 py-2.5 font-semibold text-foreground">{row.sales}</td>
                      <td className="tabular px-3 py-2.5">{row.conv}%</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Progress value={row.score} className="h-1.5 w-24" />
                          <span className="tabular text-xs text-muted-foreground">{row.score}</span>
                        </div>
                      </td>
                      <td className="tabular px-3 py-2.5">{row.cbDone}</td>
                      <td className="px-3 py-2.5">
                        {row.cbTodo > 0 ? (
                          <StatusBadge status={`${row.cbTodo} pending`} tone="warning" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Clear</span>
                        )}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right font-semibold text-foreground">
                        {money(row.commission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total revenue"
              value={money(finance.revenue)}
              hint="Carrier revenue booked"
              tone="success"
              to="/revenue"
              icon={<TrendingUp className="size-4" />}
            />
            <StatCard
              label="Net profit"
              value={money(finance.net)}
              hint={`Cost ${money(finance.cost)} · projected ${money(finance.netProjected)}`}
              tone={finance.net >= 0 ? "success" : "danger"}
              to="/expenses"
              icon={<Wallet className="size-4" />}
            />
            <StatCard
              label="Commission from carrier"
              value={money(view.carrierRevenue)}
              hint={`${label} booked`}
              tone="brand"
              to="/commissions"
              icon={<Banknote className="size-4" />}
            />
            <StatCard
              label="Receivable commission"
              value={money(view.receivable)}
              hint="Awaiting carrier payment"
              tone="warning"
              to="/call-reconciliation"
              icon={<CreditCard className="size-4" />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="rounded-2xl border-border/70 p-5 shadow-card xl:col-span-2">
              <SectionHead
                icon={<Banknote className="size-4 text-brand" />}
                title="Payroll for next week"
                subtitle={`Week starting ${finance.nextWeek || "—"} · ${finance.nextRows.length} people`}
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link to="/payroll">Open payroll</Link>
                  </Button>
                }
              />
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className={TABLE}>
                  <thead>
                    <tr className={THEAD_ROW}>
                      <th className="px-3 py-2.5">Agent</th>
                      <th className="px-3 py-2.5">Hours</th>
                      <th className="px-3 py-2.5">Base</th>
                      <th className="px-3 py-2.5">Commission</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance.nextRows.map((w) => (
                      <tr
                        key={w.id}
                        onClick={() => go("/payroll")}
                        className="cursor-pointer border-b border-border/60 last:border-0 transition-colors hover:bg-accent/40"
                      >
                        <td className="px-3 py-2.5 font-medium text-foreground">{w.agent}</td>
                        <td className="tabular px-3 py-2.5">{w.paidHours}h</td>
                        <td className="tabular px-3 py-2.5">{money2(w.basePayroll)}</td>
                        <td className="tabular px-3 py-2.5">
                          {money2(w.commissionDue + w.incentiveDue)}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={w.baseStatus} />
                        </td>
                        <td className="tabular px-3 py-2.5 text-right font-semibold text-foreground">
                          {money2(w.basePayroll + w.commissionDue + w.incentiveDue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 text-sm font-semibold">
                      <td className="px-3 py-2.5">Payroll run</td>
                      <td />
                      <td className="tabular px-3 py-2.5">{money2(finance.nextBase)}</td>
                      <td className="tabular px-3 py-2.5">{money2(finance.nextCommission)}</td>
                      <td />
                      <td className="tabular px-3 py-2.5 text-right text-brand">
                        {money2(finance.nextTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            <Card className="rounded-2xl border-border/70 p-5 shadow-card">
              <SectionHead
                icon={<Wallet className="size-4 text-brand" />}
                title="Money at a glance"
                subtitle="Range vs all-time position"
              />
              <dl className="space-y-3 text-sm">
                {[
                  ["Premium written (all time)", money2(finance.premiumWritten)],
                  ["Premium written in range", money2(view.premium)],
                  ["Commission owed to agents", money2(finance.commissionDue)],
                  ["Commission earned in range", money2(view.commission)],
                  ["Receivable from carriers", money2(view.receivable)],
                  ["Revenue collected", money2(finance.revenue)],
                  ["Receivable from carrier", money2(finance.receivable)],
                  ["Total company cost", money2(finance.cost)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="tabular font-semibold text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
              <Separator className="my-3" />
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Net position</p>
                <p
                  className={`tabular mt-1 font-display text-2xl font-semibold ${
                    finance.net >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {money2(finance.net)}
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="people" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="rounded-2xl border-border/70 p-5 shadow-card">
              <SectionHead
                icon={<CalendarClock className="size-4 text-brand-tan" />}
                title="Agents on leave"
                subtitle="Approved absences in this window"
              />
              <div className="space-y-2">
                {onLeaveNow.length === 0 && (
                  <p className="text-sm text-muted-foreground">Full floor today.</p>
                )}
                {onLeaveNow.map((l) => (
                  <Link
                    key={l.id}
                    to="/leave"
                    className="flex items-center justify-between gap-2 rounded-xl border border-border p-2.5 transition-colors hover:border-brand/40 hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{l.employee}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.startDate} → {l.endDate} · {l.days}d
                      </p>
                    </div>
                    <StatusBadge status={l.type} tone="info" />
                  </Link>
                ))}
              </div>
            </Card>

            <Card className="rounded-2xl border-border/70 p-5 shadow-card xl:col-span-2">
              <SectionHead
                icon={<Clock className="size-4 text-destructive" />}
                title="Late & attendance issues"
                subtitle="Sign-in exceptions with payroll impact"
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link to="/attendance">Attendance</Link>
                  </Button>
                }
              />
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className={TABLE}>
                  <thead>
                    <tr className={THEAD_ROW}>
                      <th className="px-3 py-2.5">Employee</th>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Detail</th>
                      <th className="px-3 py-2.5">Minutes</th>
                      <th className="px-3 py-2.5 text-right">Payroll impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lateAttendance.slice(0, 8).map((e) => (
                      <tr
                        key={e.id}
                        onClick={() => go("/attendance")}
                        className="cursor-pointer border-b border-border/60 last:border-0 transition-colors hover:bg-accent/40"
                      >
                        <td className="px-3 py-2.5 font-medium text-foreground">{e.employee}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{e.date}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={e.type} tone="danger" />
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{e.detail}</td>
                        <td className="tabular px-3 py-2.5">{e.minutes}</td>
                        <td className="tabular px-3 py-2.5 text-right">{money2(e.payrollImpact)}</td>
                      </tr>
                    ))}
                    {lateAttendance.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                          No attendance exceptions.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card className="rounded-2xl border-border/70 p-5 shadow-card">
            <SectionHead
              icon={<Users className="size-4 text-brand" />}
              title="Floor coverage right now"
              subtitle="Signed-in headcount per team"
              action={
                <span className="text-xs text-muted-foreground">
                  {employees.filter((e) => e.status !== "Signed Out").length}/{employees.length} signed in
                </span>
              }
            />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[...new Set(employees.map((e) => e.team))].map((team) => {
                const members = employees.filter((e) => e.team === team);
                const active = members.filter((m) => m.status !== "Signed Out").length;
                const alerts = members.filter((m) => m.alert).length;
                return (
                  <Link
                    key={team}
                    to="/live-operations"
                    className="block rounded-xl border border-border p-3 transition-colors hover:border-brand/40 hover:bg-accent/40"
                  >
                    <p className="text-[0.68rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                      {team}
                    </p>
                    <p className="tabular mt-1 font-display text-xl font-semibold text-foreground">
                      {active}
                      <span className="text-sm font-normal text-muted-foreground">/{members.length}</span>
                    </p>
                    {alerts > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="size-3.5" /> {alerts} alert{alerts > 1 ? "s" : ""}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
