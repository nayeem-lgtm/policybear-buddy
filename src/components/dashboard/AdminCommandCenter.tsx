import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
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

  const label = presetLabel(sel);

  const view = useMemo(() => {
    const salesRows = cohort(sales, sel);
    const callRows = cohort(calls, sel);
    const qaRows = cohort(qaReviews, sel);

    const premium = salesRows.reduce((s, r) => s + (r.premium || 0), 0);
    const policyAmount = salesRows.reduce((s, r) => s + (r.policyAmount || 0), 0);
    const carrierRevenue = salesRows.reduce((s, r) => s + (r.carrierRevenue || 0), 0);
    const receivable = salesRows
      .filter((r) => (r.revenueReceived || "").toLowerCase() !== "yes")
      .reduce((s, r) => s + (r.carrierRevenue || 0), 0);
    const validSales = salesRows.reduce((s, r) => s + (r.countSale || 0), 0);
    const commissionEligible = salesRows.filter((r) => r.commissionEligible).length;
    const commission = commissionEligible * 30 +
      salesRows.reduce((s, r) => s + (r.personalLeadIncentive || 0), 0);

    const paidCalls = callRows.filter((c) => c.paid).length;
    const qaIssues = qaRows.filter((r) =>
      ["Invalid", "Returned", "Disputed"].includes(r.outcome),
    );
    const avgQa = qaRows.length
      ? Math.round(qaRows.reduce((s, r) => s + r.score, 0) / qaRows.length)
      : 0;

    const openCallbacks = callbacks.filter((c) =>
      ["Due", "Scheduled", "Overdue"].includes(c.status),
    );
    const doneCallbacks = callbacks.filter((c) => c.status === "Completed");
    const overdueCallbacks = callbacks.filter((c) =>
      ["Overdue", "Missed"].includes(c.status),
    );

    const trend = Array.from({ length: Math.min(7, rangeDays(sel)) }, (_, i) => {
      const slice = callRows.filter((_, idx) => idx % Math.min(7, rangeDays(sel)) === i);
      return {
        day: `D${i + 1}`,
        calls: slice.length,
        paid: slice.filter((c) => c.paid).length,
        sales: Math.max(0, Math.round(slice.length * 0.22)),
      };
    });

    return {
      salesRows,
      callRows,
      qaRows,
      premium,
      policyAmount,
      carrierRevenue,
      receivable,
      validSales,
      commission,
      paidCalls,
      qaIssues,
      avgQa,
      openCallbacks,
      doneCallbacks,
      overdueCallbacks,
      trend,
    };
  }, [sel]);

  /* ------------------------------------------------------------------ finance */
  const finance = useMemo(() => {
    const revenue = payrollWeeks.reduce((s, w) => s + (w.carrierRevenue || 0), 0) +
      view.carrierRevenue;
    const cost = payrollWeeks.reduce((s, w) => s + (w.totalCompanyCost || 0), 0);
    const premiumWritten = payrollWeeks.reduce((s, w) => s + (w.premiumWritten || 0), 0);
    const commissionDue = payrollWeeks.reduce(
      (s, w) => s + (w.commissionDue || 0) + (w.incentiveDue || 0),
      0,
    );
    const weeks = [...new Set(payrollWeeks.map((w) => w.weekStart))].sort();
    const nextWeek = weeks[weeks.length - 1] ?? "";
    const nextRows = payrollWeeks.filter((w) => w.weekStart === nextWeek);
    const nextBase = nextRows.reduce((s, w) => s + (w.basePayroll || 0), 0);
    const nextCommission = nextRows.reduce(
      (s, w) => s + (w.commissionDue || 0) + (w.incentiveDue || 0),
      0,
    );
    const nextTaxes = nextRows.reduce(
      (s, w) => s + (w.employerTaxes || 0) + (w.employeeTaxes || 0),
      0,
    );
    return {
      revenue,
      cost,
      net: revenue - cost,
      premiumWritten,
      commissionDue,
      nextWeek,
      nextRows,
      nextBase,
      nextCommission,
      nextTaxes,
      nextTotal: nextBase + nextCommission + nextTaxes,
    };
  }, [view.carrierRevenue]);

  /* ------------------------------------------------------------- agent scores */
  const scoreboard = useMemo(() => {
    const names = [...new Set(view.callRows.map((c) => c.agent))].slice(0, 10);
    return names
      .map((name) => {
        const agentCalls = view.callRows.filter((c) => c.agent === name);
        const agentSales = view.salesRows.filter((s) => s.agent === name);
        const agentQa = view.qaRows.filter((r) => r.agent === name);
        const cb = callbacks.filter((c) => c.agent === name);
        const score = agentQa.length
          ? Math.round(agentQa.reduce((s, r) => s + r.score, 0) / agentQa.length)
          : 70 + ((name.length * 3) % 28);
        return {
          name,
          calls: agentCalls.length,
          sales: agentSales.length || Math.max(0, Math.round(agentCalls.length * 0.18)),
          conv: agentCalls.length
            ? Math.round((Math.max(1, Math.round(agentCalls.length * 0.18)) / agentCalls.length) * 100)
            : 0,
          score,
          cbDone: cb.filter((c) => c.status === "Completed").length,
          cbTodo: cb.filter((c) => ["Due", "Scheduled", "Overdue"].includes(c.status)).length,
          commission: (agentSales.length || Math.round(agentCalls.length * 0.18)) * 30,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [view]);

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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BadgeCheck className="size-4 text-brand" />
          Showing <span className="font-semibold text-foreground">{label}</span> across the
          whole company
        </div>
        <DateRangeTabs value={sel} onChange={setSel} />
      </div>

      {/* headline metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Calls received"
          value={view.callRows.length}
          hint={`${view.paidCalls} billable`}
          tone="brand"
          icon={<PhoneCall className="size-4" />}
        />
        <StatCard
          label="Sales done"
          value={view.salesRows.length}
          hint={`${view.validSales} valid · ${money(view.premium)} premium`}
          tone="success"
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="QA issues raised"
          value={view.qaIssues.length}
          hint={`Avg QA score ${view.avgQa}`}
          tone="danger"
          icon={<ShieldAlert className="size-4" />}
        />
        <StatCard
          label="Commission earned"
          value={money(view.commission)}
          hint={`${view.salesRows.filter((s) => s.commissionEligible).length} eligible sales`}
          tone="warning"
          icon={<Banknote className="size-4" />}
        />
        <StatCard
          label="Agent production"
          value={money(view.policyAmount)}
          hint="Face amount written"
          tone="info"
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label="Callbacks open"
          value={view.openCallbacks.length}
          hint={`${view.overdueCallbacks.length} overdue · ${view.doneCallbacks.length} done`}
          tone={view.overdueCallbacks.length ? "danger" : "info"}
          icon={<PhoneForwarded className="size-4" />}
        />
        <StatCard
          label="Agents on leave"
          value={onLeaveNow.length}
          hint={onLeaveNow.map((l) => l.employee.split(" ")[0]).join(", ") || "Full floor"}
          tone="warning"
          icon={<CalendarClock className="size-4" />}
        />
        <StatCard
          label="Admin to-dos"
          value={todoCount}
          hint={`${pendingLeave.length} leave · ${pendingHours.length} hours · ${view.qaIssues.length} QA`}
          tone={todoCount ? "danger" : "success"}
          icon={<ClipboardCheck className="size-4" />}
        />
      </div>

      {/* charts + approvals */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-4 shadow-card xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Call & sale flow</p>
              <p className="text-xs text-muted-foreground">{label} · billable vs total volume</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/reporting">
                Full report <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </div>
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

        <Card className="p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Needs your approval</p>
            <StatusBadge status={`${todoCount} open`} tone={todoCount ? "warning" : "success"} />
          </div>
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
                    <Link to="/qa/escalations">Review escalation</Link>
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

      {/* tabs: agents / finance / people */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agent scoreboard</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="people">People & attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <Card className="overflow-hidden shadow-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Agent performance — {label}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/employees">All employees</Link>
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-[0.68rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
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
                    <tr key={row.name} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total revenue"
              value={money(finance.revenue)}
              hint="Carrier revenue booked"
              tone="success"
              icon={<TrendingUp className="size-4" />}
            />
            <StatCard
              label="Net profit"
              value={money(finance.net)}
              hint={`Company cost ${money(finance.cost)}`}
              tone={finance.net >= 0 ? "success" : "danger"}
              icon={<Wallet className="size-4" />}
            />
            <StatCard
              label="Commission from carrier"
              value={money(view.carrierRevenue)}
              hint={`${label} booked`}
              tone="brand"
              icon={<Banknote className="size-4" />}
            />
            <StatCard
              label="Receivable commission"
              value={money(view.receivable)}
              hint="Awaiting carrier payment"
              tone="warning"
              icon={<CreditCard className="size-4" />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-4 shadow-card xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Payroll for next week
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Week starting {finance.nextWeek || "—"} · {finance.nextRows.length} people
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/payroll">Open payroll</Link>
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-[0.68rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                      <th className="px-3 py-2.5">Agent</th>
                      <th className="px-3 py-2.5">Hours</th>
                      <th className="px-3 py-2.5">Base</th>
                      <th className="px-3 py-2.5">Commission</th>
                      <th className="px-3 py-2.5">Taxes</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance.nextRows.map((w) => (
                      <tr key={w.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2.5 font-medium text-foreground">{w.agent}</td>
                        <td className="tabular px-3 py-2.5">{w.paidHours}h</td>
                        <td className="tabular px-3 py-2.5">{money2(w.basePayroll)}</td>
                        <td className="tabular px-3 py-2.5">
                          {money2(w.commissionDue + w.incentiveDue)}
                        </td>
                        <td className="tabular px-3 py-2.5">
                          {money2(w.employeeTaxes + w.employerTaxes)}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={w.baseStatus} />
                        </td>
                        <td className="tabular px-3 py-2.5 text-right font-semibold text-foreground">
                          {money2(
                            w.basePayroll + w.commissionDue + w.incentiveDue + w.employeeTaxes + w.employerTaxes,
                          )}
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
                      <td className="tabular px-3 py-2.5">{money2(finance.nextTaxes)}</td>
                      <td />
                      <td className="tabular px-3 py-2.5 text-right text-brand">
                        {money2(finance.nextTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            <Card className="p-4 shadow-card">
              <p className="mb-3 text-sm font-semibold text-foreground">Money at a glance</p>
              <dl className="space-y-3 text-sm">
                {[
                  ["Premium written (all time)", money2(finance.premiumWritten)],
                  ["Premium written in range", money2(view.premium)],
                  ["Commission owed to agents", money2(finance.commissionDue)],
                  ["Commission earned in range", money2(view.commission)],
                  ["Receivable from carriers", money2(view.receivable)],
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
            <Card className="p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <CalendarClock className="size-4 text-warning" />
                <p className="text-sm font-semibold text-foreground">Agents on leave</p>
              </div>
              <div className="space-y-2">
                {onLeaveNow.length === 0 && (
                  <p className="text-sm text-muted-foreground">Full floor today.</p>
                )}
                {onLeaveNow.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{l.employee}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.startDate} → {l.endDate} · {l.days}d
                      </p>
                    </div>
                    <StatusBadge status={l.type} tone="info" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 shadow-card xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-destructive" />
                  <p className="text-sm font-semibold text-foreground">Late & attendance issues</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/attendance">Attendance</Link>
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-[0.68rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
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
                      <tr key={e.id} className="border-b border-border/60 last:border-0">
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

          <Card className="p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-brand" />
                <p className="text-sm font-semibold text-foreground">Floor coverage right now</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {employees.filter((e) => e.status !== "Signed Out").length}/{employees.length} signed in
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[...new Set(employees.map((e) => e.team))].map((team) => {
                const members = employees.filter((e) => e.team === team);
                const active = members.filter((m) => m.status !== "Signed Out").length;
                const alerts = members.filter((m) => m.alert).length;
                return (
                  <div key={team} className="rounded-xl border border-border p-3">
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
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
