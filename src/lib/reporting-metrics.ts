import {
  publisherCps,
  campaignCps,
  sales,
  trafficCalls,
  trafficByDay,
  type CpsRow,
} from "@/lib/company-data";

export type ReportDimension = "publisher" | "campaign" | "day";

export interface ReportRow {
  key: string;
  name: string;
  incoming: number;
  live: number;
  completed: number;
  connects: number;
  failedConnects: number;
  payable: number;
  billable: number;
  converted: number;
  duplicate: number;
  blocked: number;
  revenue: number;
  payout: number;
  profit: number;
  tcdSeconds: number;
}

function pct(num: number, den: number) {
  return den ? (num / den) * 100 : 0;
}

export const fmtPct = (n: number) => `${n.toFixed(2)}%`;
export const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function fmtDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":");
}

/** Derived per-row measures used by the report grid. */
export function derive(row: ReportRow) {
  const acd = row.connects ? row.tcdSeconds / row.connects : 0;
  return {
    payablePct: pct(row.payable, row.incoming),
    billablePct: pct(row.billable, row.incoming),
    conversionPct: pct(row.converted, row.billable || row.incoming),
    connectPct: pct(row.connects, row.incoming),
    cpc: row.connects ? row.payout / row.connects : 0,
    rpc: row.connects ? row.revenue / row.connects : 0,
    cpp: row.payable ? row.payout / row.payable : 0,
    rpb: row.billable ? row.revenue / row.billable : 0,
    cps: row.converted ? row.payout / row.converted : 0,
    rps: row.converted ? row.revenue / row.converted : 0,
    marginPct: pct(row.profit, row.revenue),
    acd,
  };
}

function fromCps(source: CpsRow[], match: (name: string) => number): ReportRow[] {
  return source.map((c) => {
    const incoming = Math.max(c.converted, match(c.name));
    const revenue = sales
      .filter((s) => (s.publisher ?? "") === c.name)
      .reduce((sum, s) => sum + s.premium, 0);
    const rev = revenue || c.revenue;
    return {
      key: c.name,
      name: c.name,
      incoming,
      live: 0,
      completed: incoming,
      connects: c.converted,
      failedConnects: Math.max(0, incoming - c.converted),
      payable: c.converted,
      billable: c.converted,
      converted: c.validSales,
      duplicate: 0,
      blocked: 0,
      revenue: rev,
      payout: c.payout,
      profit: rev - c.payout,
      tcdSeconds: c.converted * 212,
    };
  });
}

export function buildReport(dimension: ReportDimension): ReportRow[] {
  if (dimension === "publisher") {
    return fromCps(publisherCps, (name) => trafficCalls.filter((t) => t.publisher === name).length).sort(
      (a, b) => b.payout - a.payout,
    );
  }
  if (dimension === "campaign") {
    return fromCps(campaignCps, (name) => trafficCalls.filter((t) => t.campaign === name).length).sort(
      (a, b) => b.payout - a.payout,
    );
  }
  return trafficByDay.map((d) => {
    const revenue = sales.filter((s) => s.saleDate === d.date).reduce((sum, s) => sum + s.premium, 0);
    const payout = d.calls * 24;
    return {
      key: d.date,
      name: d.date,
      incoming: d.calls,
      live: 0,
      completed: d.calls,
      connects: d.calls - d.other,
      failedConnects: d.other,
      payable: d.calls - d.other,
      billable: d.calls - d.other,
      converted: d.sales,
      duplicate: 0,
      blocked: 0,
      revenue,
      payout,
      profit: revenue - payout,
      tcdSeconds: (d.calls - d.other) * 212,
    };
  });
}

export function totalRow(rows: ReportRow[]): ReportRow {
  const sum = (pick: (r: ReportRow) => number) => rows.reduce((s, r) => s + pick(r), 0);
  return {
    key: "__total",
    name: "Totals",
    incoming: sum((r) => r.incoming),
    live: sum((r) => r.live),
    completed: sum((r) => r.completed),
    connects: sum((r) => r.connects),
    failedConnects: sum((r) => r.failedConnects),
    payable: sum((r) => r.payable),
    billable: sum((r) => r.billable),
    converted: sum((r) => r.converted),
    duplicate: sum((r) => r.duplicate),
    blocked: sum((r) => r.blocked),
    revenue: sum((r) => r.revenue),
    payout: sum((r) => r.payout),
    profit: sum((r) => r.profit),
    tcdSeconds: sum((r) => r.tcdSeconds),
  };
}
