/**
 * Metrics engine — the single source of truth for every number the CRM shows.
 *
 * Each dashboard (agent scorecard, admin overview, finance, payroll, callbacks)
 * calls into this module with a date selection, so calls, sales, commissions,
 * callbacks, attendance and revenue always reconcile with each other.
 */

import type { DateSelection } from "@/components/crm/DateRangeTabs";
import { inSelection, selectionBounds, selectionDayList } from "@/lib/date-range";
import { parseLocalDate } from "@/lib/data-clock";
import {
  HOURLY_RATE,
  commissionPerSale,
  payables,
  payrollWeeks,
  sales,
  type SaleRecord,
} from "@/lib/company-data";
import { callbacks, calls, employees, qaReviews } from "@/lib/mock-data";

/* ------------------------------------------------------------------ helpers */

/** `"4m 32s"` → seconds. */
export function durationToSeconds(value: string | null | undefined): number {
  if (!value) return 0;
  const m = /(\d+)\s*m/.exec(value);
  const s = /(\d+)\s*s/.exec(value);
  return (m ? Number(m[1]) * 60 : 0) + (s ? Number(s[1]) : 0);
}

export function formatHm(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function pct(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------- call metrics */

export interface CallMetrics {
  total: number;
  inbound: number;
  outbound: number;
  paid: number;
  talkSeconds: number;
  avgHandleSeconds: number;
}

function callMetrics(rows: typeof calls): CallMetrics {
  const talkSeconds = rows.reduce((sum, c) => sum + durationToSeconds(c.duration), 0);
  return {
    total: rows.length,
    inbound: rows.filter((c) => c.direction === "Inbound").length,
    outbound: rows.filter((c) => c.direction === "Outbound").length,
    paid: rows.filter((c) => c.paid).length,
    talkSeconds,
    avgHandleSeconds: rows.length ? Math.round(talkSeconds / rows.length) : 0,
  };
}

/* ------------------------------------------------------------ sales metrics */

export interface SalesMetrics {
  count: number;
  validSales: number;
  premium: number;
  policyAmount: number;
  carrierRevenue: number;
  revenueCollected: number;
  receivable: number;
  issued: number;
  pending: number;
  cancelled: number;
  avgPremium: number;
}

/**
 * Carrier revenue model (American Amicable final expense advance):
 * the carrier advances `CARRIER_ADVANCE_MONTHS` of annualised premium at
 * `CARRIER_COMMISSION_RATE`. Workbook rows carry the figure once accounting
 * confirms it; until then we book the expected advance so revenue, receivables
 * and net profit stay reconcilable with what the floor actually wrote.
 */
export const CARRIER_ADVANCE_MONTHS = 9;
export const CARRIER_COMMISSION_RATE = 0.75;

const DEAD_STATUSES = ["Cancelled", "Chargeback", "Rejected"];

/** Expected (booked) carrier revenue for one sale. */
export function expectedCarrierRevenue(sale: SaleRecord) {
  if (DEAD_STATUSES.includes(sale.saleStatus ?? "")) return 0;
  if (sale.carrierRevenue > 0) return sale.carrierRevenue;
  return round2((sale.premium || 0) * CARRIER_ADVANCE_MONTHS * CARRIER_COMMISSION_RATE);
}

/** Revenue is recognised once the first draft has run (or accounting confirmed). */
export function isRevenueCollected(sale: SaleRecord) {
  if (DEAD_STATUSES.includes(sale.saleStatus ?? "")) return false;
  if ((sale.revenueReceived || "").toLowerCase() === "yes") return true;
  if (["First Payment Posted", "Active/Paid"].includes(sale.paymentStatus ?? "")) return true;
  const draft = sale.draftDate ? parseLocalDate(sale.draftDate) : null;
  return !!draft && draft.getTime() <= Date.now();
}

function salesMetrics(rows: SaleRecord[]): SalesMetrics {
  const collected = rows
    .filter(isRevenueCollected)
    .reduce((sum, s) => sum + expectedCarrierRevenue(s), 0);
  const carrierRevenue = rows.reduce((sum, s) => sum + expectedCarrierRevenue(s), 0);
  const premium = rows.reduce((sum, s) => sum + (s.premium || 0), 0);



  return {
    count: rows.length,
    validSales: rows.reduce((sum, s) => sum + (s.countSale || 0), 0),
    premium: round2(premium),
    policyAmount: rows.reduce((sum, s) => sum + (s.policyAmount || 0), 0),
    carrierRevenue: round2(carrierRevenue),
    revenueCollected: round2(collected),
    receivable: round2(carrierRevenue - collected),
    issued: rows.filter((s) => s.saleStatus === "Issued").length,
    pending: rows.filter((s) => ["Pending", "Submitted", "Held"].includes(s.saleStatus ?? "")).length,
    cancelled: rows.filter((s) =>
      ["Cancelled", "Chargeback", "Rejected"].includes(s.saleStatus ?? ""),
    ).length,
    avgPremium: rows.length ? round2(premium / rows.length) : 0,
  };
}

/**
 * Tiered commission: the per-sale rate depends on how many valid sales the
 * agent booked in the period (see `commissionTiers`), plus personal-lead
 * incentives. Only commission-eligible rows count.
 */
/** Human label for the tier a per-sale rate belongs to. */
export function commissionPerSaleLabel(rate: number) {
  if (rate >= 90) return "top tier";
  if (rate >= 70) return "tier 3";
  if (rate >= 50) return "tier 2";
  return "starting tier";
}

export function commissionFor(rows: SaleRecord[]) {
  const byAgent = new Map<string, SaleRecord[]>();
  for (const row of rows) {
    const list = byAgent.get(row.agent) ?? [];
    list.push(row);
    byAgent.set(row.agent, list);
  }

  let commission = 0;
  let incentives = 0;
  let eligibleSales = 0;

  for (const agentRows of byAgent.values()) {
    const eligible = agentRows.filter((r) => r.commissionEligible);
    const valid = eligible.reduce((sum, r) => sum + (r.countSale || 0), 0);
    const rate = commissionPerSale(valid);
    commission += valid * rate;
    eligibleSales += valid;
    incentives += agentRows.reduce((sum, r) => sum + (r.personalLeadIncentive || 0), 0);
  }

  return {
    rate: commissionPerSale(eligibleSales),
    eligibleSales,
    commission: round2(commission),
    incentives: round2(incentives),
    total: round2(commission + incentives),
  };
}

/* --------------------------------------------------------- callback metrics */

export interface CallbackMetrics {
  open: number;
  overdue: number;
  done: number;
  scheduled: number;
  completionRate: number;
}

const OPEN_STATUSES = ["Due", "Scheduled", "Overdue", "Missed"];

function callbackMetrics(rows: typeof callbacks): CallbackMetrics {
  const open = rows.filter((c) => OPEN_STATUSES.includes(c.status));
  const done = rows.filter((c) => c.status === "Completed");
  return {
    open: open.length,
    overdue: rows.filter((c) => ["Overdue", "Missed"].includes(c.status)).length,
    done: done.length,
    scheduled: rows.filter((c) => c.status === "Scheduled").length,
    completionRate: pct(done.length, done.length + open.length),
  };
}

/* --------------------------------------------------------------- QA metrics */

export interface QaMetrics {
  reviews: number;
  avgScore: number;
  escalations: number;
  disputes: number;
  pending: number;
}

function qaMetrics(rows: typeof qaReviews): QaMetrics {
  return {
    reviews: rows.length,
    avgScore: rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0,
    escalations: rows.filter((r) => ["Invalid", "Returned", "Disputed"].includes(r.outcome)).length,
    disputes: rows.filter((r) => r.outcome === "Disputed").length,
    pending: rows.filter((r) => r.outcome === "Pending").length,
  };
}

/* ---------------------------------------------------------- scoped datasets */

export function scopedSales(sel: DateSelection) {
  return sales.filter((s) => inSelection(s.saleDate, sel));
}
export function scopedCalls(sel: DateSelection) {
  return calls.filter((c) => inSelection(c.startedAt, sel));
}
export function scopedCallbacks(sel: DateSelection) {
  return callbacks.filter((c) => inSelection(c.scheduledFor, sel));
}
/** Every callback still needing work, regardless of the selected window. */
export function openCallbackQueue(agent?: string) {
  return callbacks.filter(
    (c) => OPEN_STATUSES.includes(c.status) && (!agent || c.agent === agent),
  );
}
export function scopedQa(sel: DateSelection) {
  return qaReviews.filter((r) => inSelection(r.submittedAt, sel));
}
export function scopedPayrollWeeks(sel: DateSelection) {
  const { from, to } = selectionBounds(sel);
  return payrollWeeks.filter((w) => {
    const start = parseLocalDate(w.weekStart);
    if (!start) return false;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return start <= to && end >= from;
  });
}
export function scopedPayables(sel: DateSelection) {
  return payables.filter((p) => inSelection(p.costDate ?? `${p.month}-01`, sel));
}

/**
 * Attendance-driven hours: a payroll week is a Mon–Fri book of paid hours, so
 * only the working days that fall inside the selected window are counted.
 */
export function weekHoursInSelection(
  week: { weekStart: string; paidHours: number },
  sel: DateSelection,
) {
  const start = parseLocalDate(week.weekStart);
  if (!start) return 0;
  const { from, to } = selectionBounds(sel);
  let workingDays = 0;
  let inWindow = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    const isWorkday = day.getDay() >= 1 && day.getDay() <= 5;
    if (!isWorkday) continue;
    workingDays += 1;
    if (day >= from && day <= to) inWindow += 1;
  }
  if (!workingDays) return 0;
  return (week.paidHours || 0) * (inWindow / workingDays);
}

/* ---------------------------------------------------------- company metrics */

export interface DayPoint {
  date: string;
  label: string;
  calls: number;
  paid: number;
  sales: number;
  premium: number;
  revenue: number;
}

export interface CompanyMetrics {
  sel: DateSelection;
  saleRows: SaleRecord[];
  callRows: typeof calls;
  callbackRows: typeof callbacks;
  qaRows: typeof qaReviews;
  calls: CallMetrics;
  sales: SalesMetrics;
  commission: ReturnType<typeof commissionFor>;
  callbacks: CallbackMetrics;
  qa: QaMetrics;
  conversion: number;
  paidCallConversion: number;
  trend: DayPoint[];
}

export function companyMetrics(sel: DateSelection): CompanyMetrics {
  const saleRows = scopedSales(sel);
  const callRows = scopedCalls(sel);
  const callbackRows = scopedCallbacks(sel);
  const qaRows = scopedQa(sel);

  const callStats = callMetrics(callRows);
  const saleStats = salesMetrics(saleRows);

  const trend: DayPoint[] = selectionDayList(sel).map((day) => {
    const dayCalls = callRows.filter((c) => c.startedAt.startsWith(day));
    const daySales = saleRows.filter((s) => s.saleDate === day);
    const parsed = parseLocalDate(day);
    return {
      date: day,
      label: parsed
        ? parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : day,
      calls: dayCalls.length,
      paid: dayCalls.filter((c) => c.paid).length,
      sales: daySales.length,
      premium: round2(daySales.reduce((sum, s) => sum + (s.premium || 0), 0)),
      revenue: round2(daySales.reduce((sum, s) => sum + expectedCarrierRevenue(s), 0)),
    };
  });

  return {
    sel,
    saleRows,
    callRows,
    callbackRows,
    qaRows,
    calls: callStats,
    sales: saleStats,
    commission: commissionFor(saleRows),
    callbacks: callbackMetrics(callbackRows),
    qa: qaMetrics(qaRows),
    conversion: pct(saleStats.count, callStats.total),
    paidCallConversion: pct(saleStats.count, callStats.paid),
    trend,
  };
}

/* ------------------------------------------------------------ agent metrics */

export interface AgentMetrics extends CompanyMetrics {
  agent: string;
  hoursWorked: number;
  basePay: number;
  totalPay: number;
  rank: number;
  agentCount: number;
  qaScore: number;
  openCallbacks: typeof callbacks;
  disputes: typeof qaReviews;
}

/** Resolve a signed-in user name onto the agent roster (falls back to a peer). */
export function resolveAgentName(name: string | undefined) {
  const roster = [...new Set(sales.map((s) => s.agent))];
  if (name && roster.includes(name)) return name;
  const callRoster = [...new Set(calls.map((c) => c.agent))];
  if (name && callRoster.includes(name)) return name;
  return roster[0] ?? name ?? "";
}

export function agentMetrics(agentName: string, sel: DateSelection): AgentMetrics {
  const base = companyMetrics(sel);
  const saleRows = base.saleRows.filter((s) => s.agent === agentName);
  const callRows = base.callRows.filter((c) => c.agent === agentName);
  const callbackRows = base.callbackRows.filter((c) => c.agent === agentName);
  const qaRows = base.qaRows.filter((r) => r.agent === agentName);

  const callStats = callMetrics(callRows);
  const saleStats = salesMetrics(saleRows);
  const commission = commissionFor(saleRows);

  const weeks = scopedPayrollWeeks(sel).filter((w) => w.agent === agentName);
  const hoursWorked = weeks.length
    ? round2(weeks.reduce((sum, w) => sum + weekHoursInSelection(w, sel), 0))
    : round2(callStats.talkSeconds / 3600 + callRows.length * 0.03);
  const basePay = round2(hoursWorked * HOURLY_RATE);

  const leaderboard = [...new Set(base.saleRows.map((s) => s.agent))]
    .map((name) => ({
      name,
      sales: base.saleRows.filter((s) => s.agent === name).length,
    }))
    .sort((a, b) => b.sales - a.sales);

  const trend: DayPoint[] = base.trend.map((point) => {
    const dayCalls = callRows.filter((c) => c.startedAt.startsWith(point.date));
    const daySales = saleRows.filter((s) => s.saleDate === point.date);
    return {
      ...point,
      calls: dayCalls.length,
      paid: dayCalls.filter((c) => c.paid).length,
      sales: daySales.length,
      premium: round2(daySales.reduce((sum, s) => sum + (s.premium || 0), 0)),
      revenue: round2(daySales.reduce((sum, s) => sum + expectedCarrierRevenue(s), 0)),
    };
  });

  const qaStats = qaMetrics(qaRows);

  return {
    ...base,
    agent: agentName,
    saleRows,
    callRows,
    callbackRows,
    qaRows,
    calls: callStats,
    sales: saleStats,
    commission,
    callbacks: callbackMetrics(callbackRows),
    qa: qaStats,
    conversion: pct(saleStats.count, callStats.total),
    paidCallConversion: pct(saleStats.count, callStats.paid),
    trend,
    hoursWorked,
    basePay,
    totalPay: round2(basePay + commission.total),
    rank: Math.max(1, leaderboard.findIndex((r) => r.name === agentName) + 1),
    agentCount: Math.max(leaderboard.length, 1),
    qaScore: qaStats.avgScore,
    openCallbacks: callbackRows.filter((c) => OPEN_STATUSES.includes(c.status)),
    disputes: qaRows.filter((r) => ["Disputed", "Returned", "Invalid"].includes(r.outcome)),
  };
}

/* -------------------------------------------------------- finance roll-up */

export interface FinanceMetrics {
  revenueCollected: number;
  revenueBooked: number;
  receivable: number;
  premiumWritten: number;
  basePayroll: number;
  commission: number;
  trafficCost: number;
  seatCost: number;
  otherCost: number;
  manualExpenses: number;
  totalCost: number;
  netProfit: number;
  /** Projected net once every booked advance is collected. */
  netProjected: number;
  margin: number;
}

export function financeMetrics(sel: DateSelection, manualExpenses = 0): FinanceMetrics {
  const saleRows = scopedSales(sel);
  const weeks = scopedPayrollWeeks(sel);
  const payableRows = scopedPayables(sel);
  const saleStats = salesMetrics(saleRows);
  const commission = commissionFor(saleRows);

  const basePayroll = round2(
    weeks.reduce((s, w) => s + weekHoursInSelection(w, sel) * (w.hourlyRate || HOURLY_RATE), 0),
  );
  const trafficCost = round2(
    weeks.reduce((s, w) => s + (w.trafficCost || 0), 0) ||
      payableRows
        .filter((p) => p.category === "Ringba/CallGrid")
        .reduce((s, p) => s + (p.amount || 0), 0),
  );
  const seatCost = round2(weeks.reduce((s, w) => s + (w.callToolsWeekly || 0), 0));
  const otherCost = round2(
    payableRows
      .filter((p) => p.category === "Other Expense")
      .reduce((s, p) => s + (p.amount || 0), 0),
  );

  const totalCost = round2(
    basePayroll + commission.total + trafficCost + seatCost + otherCost + manualExpenses,
  );
  const revenueCollected = saleStats.revenueCollected;

  return {
    revenueCollected,
    revenueBooked: saleStats.carrierRevenue,
    receivable: saleStats.receivable,
    premiumWritten: saleStats.premium,
    basePayroll,
    commission: commission.total,
    trafficCost,
    seatCost,
    otherCost,
    manualExpenses: round2(manualExpenses),
    totalCost,
    netProfit: round2(revenueCollected - totalCost),
    netProjected: round2(saleStats.carrierRevenue - totalCost),
    margin: pct(revenueCollected - totalCost, revenueCollected || 1),
  };
}

/* --------------------------------------------------------- people / floor */

export function floorMetrics() {
  const agents = employees.filter((e) => e.role === "Agent");
  const signedIn = agents.filter((e) => e.status !== "Signed Out");
  const onBreak = agents.filter((e) => /break|lunch/i.test(e.status));
  return {
    agents,
    total: agents.length,
    signedIn: signedIn.length,
    onBreak: onBreak.length,
    alerts: employees.filter((e) => e.alert),
    callbacksDue: agents.reduce((sum, e) => sum + (e.callbacksDue || 0), 0),
    postCallPending: agents.reduce((sum, e) => sum + (e.postCallPending || 0), 0),
    utilization: pct(signedIn.length - onBreak.length, agents.length || 1),
  };
}
