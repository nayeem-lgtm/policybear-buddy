import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Banknote, DollarSign, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { useFilters, unique } from "@/lib/use-filters";
import { Card } from "@/components/ui/card";
import { sales, payrollWeeks, weekStarts, AGENT_NAMES, money, type SaleRecord } from "@/lib/company-data";

export const Route = createFileRoute("/_shell/revenue")({
  head: () => ({
    meta: [
      { title: "Revenue & Cash Position — Policy Bear CRM" },
      { name: "description", content: "Premium written, carrier revenue received, and weekly net cash position across payroll and traffic cost." },
      { property: "og:title", content: "Revenue & Cash Position — Policy Bear CRM" },
      { property: "og:description", content: "Premium written, carrier revenue received, and weekly net cash position across payroll and traffic cost." },
    ],
  }),
  component: RevenuePage,
});

function fmtWeek(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Bar({ label, value, max, tone = "brand" }: { label: string; value: number; max: number; tone?: "brand" | "danger" | "success" }) {
  const pct = max > 0 ? Math.min(100, (Math.abs(value) / max) * 100) : 0;
  const toneClass = tone === "danger" ? "bg-destructive" : tone === "success" ? "bg-success" : "bg-brand";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular font-medium text-foreground">{money(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
        <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RevenuePage() {
  const { search, setSearch, values, setValue, reset, filtered } = useFilters(sales, {
    searchFields: (r) => [r.customer, r.agent, r.id],
    filters: {
      week: (r) => r.weekStart ?? "",
      agent: (r) => r.agent,
      paymentStatus: (r) => r.paymentStatus ?? "",
    },
  });

  const premiumWritten = filtered.reduce((s, r) => s + r.premium, 0);
  const policyAmountTotal = filtered.reduce((s, r) => s + r.policyAmount, 0);
  const carrierRevenueReceived = filtered.filter((r) => r.revenueReceived === "Yes").reduce((s, r) => s + r.carrierRevenue, 0);
  const pendingFirstPayment = filtered.filter((r) => r.paymentStatus === "Pending First Payment");
  const pendingExposure = pendingFirstPayment.reduce((s, r) => s + r.premium, 0);

  const totalCompanyCost = payrollWeeks.reduce((s, r) => s + r.totalCompanyCost, 0);
  const netCashTotal = payrollWeeks.reduce((s, r) => s + r.netCash, 0);

  const weeklyRows = useMemo(() => {
    return weekStarts.map((w) => {
      const wp = payrollWeeks.filter((p) => p.weekStart === w);
      const premium = sales.filter((s) => s.weekStart === w).reduce((s, r) => s + r.premium, 0);
      const cost = wp.reduce((s, r) => s + r.totalCompanyCost, 0);
      const netCash = wp.reduce((s, r) => s + r.netCash, 0);
      return { week: w, premium, cost, netCash };
    });
  }, []);

  const maxWeekly = Math.max(...weeklyRows.map((r) => Math.max(r.premium, r.cost, Math.abs(r.netCash))), 1);

  const paymentStatusRows = useMemo(() => {
    const map = new Map<string, { status: string; count: number; premium: number }>();
    for (const s of sales) {
      const key = s.paymentStatus ?? "Unknown";
      const cur = map.get(key) ?? { status: key, count: 0, premium: 0 };
      cur.count += 1;
      cur.premium += s.premium;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.premium - a.premium);
  }, []);

  const columns: Column<SaleRecord>[] = [
    { key: "id", header: "Sale", cell: (r) => <span className="font-medium text-foreground">{r.id}</span> },
    { key: "agent", header: "Agent", cell: (r) => r.agent },
    { key: "week", header: "Week", cell: (r) => (r.weekStart ? fmtWeek(r.weekStart) : "—") },
    { key: "customer", header: "Customer", cell: (r) => r.customer },
    { key: "policyAmount", header: "Policy Amount", cell: (r) => <span className="tabular">{money(r.policyAmount)}</span>, align: "right" },
    { key: "premium", header: "Premium Written", cell: (r) => <span className="tabular font-medium">{money(r.premium)}</span>, align: "right" },
    { key: "paymentStatus", header: "Payment Status", cell: (r) => <StatusBadge status={r.paymentStatus ?? "Unknown"} /> },
    { key: "paymentRisk", header: "Payment Risk", cell: (r) => <span className="text-xs text-muted-foreground">{r.paymentRisk ?? "—"}</span> },
    {
      key: "carrierRevenue",
      header: "Carrier Revenue Received",
      cell: (r) => (
        <div className="text-right">
          <p className="tabular">{r.revenueReceived === "Yes" ? money(r.carrierRevenue) : "—"}</p>
          {r.revenueReceivedDate && <p className="text-xs text-muted-foreground">{r.revenueReceivedDate}</p>}
        </div>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accounting"
        title="Revenue & Cash Position"
        description="Premium written, carrier revenue, and net cash position by week. Carrier revenue posts only after the customer's first payment."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Premium written" value={money(premiumWritten)} hint={`policy amount ${money(policyAmountTotal)}`} icon={<TrendingUp className="size-4" />} tone="brand" />
        <StatCard label="Carrier revenue received" value={money(carrierRevenueReceived)} hint="posted after first payment" icon={<DollarSign className="size-4" />} tone="success" />
        <StatCard label="Total company cost" value={money(totalCompanyCost)} hint="all weeks" icon={<Banknote className="size-4" />} tone="warning" />
        <StatCard label="Net cash position" value={money(netCashTotal)} hint="all weeks" tone={netCashTotal < 0 ? "danger" : "success"} />
      </div>

      <Card className="flex items-start gap-3 p-4 shadow-card">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{pendingFirstPayment.length} policies</span> ({money(pendingExposure)} in premium) are
          Pending First Payment — carrier revenue will not post for these until the customer's first draft succeeds.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-4 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Weekly premium vs. company cost vs. net cash</h3>
          <div className="space-y-3">
            {weeklyRows.map((r) => (
              <div key={r.week} className="space-y-1.5 border-b border-border pb-2 last:border-0">
                <p className="text-xs font-medium text-muted-foreground">Week of {fmtWeek(r.week)}</p>
                <Bar label="Premium written" value={r.premium} max={maxWeekly} tone="brand" />
                <Bar label="Total company cost" value={r.cost} max={maxWeekly} tone="danger" />
                <Bar label="Net cash position" value={r.netCash} max={maxWeekly} tone={r.netCash < 0 ? "danger" : "success"} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-3 p-4 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Exposure by payment status</h3>
          <div className="space-y-2">
            {paymentStatusRows.map((r) => (
              <div key={r.status} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-muted-foreground">{r.count} sales</span>
                </div>
                <span className="tabular font-medium">{money(r.premium)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customer or agent…"
        filters={[
          { key: "week", label: "Week", options: weekStarts.map((w) => w) },
          { key: "agent", label: "Agent", options: AGENT_NAMES.slice() },
          { key: "paymentStatus", label: "Payment Status", options: unique(sales, (r) => r.paymentStatus ?? "") },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} />
    </div>
  );
}
