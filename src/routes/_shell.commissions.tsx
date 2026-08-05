import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeDollarSign, Layers, TrendingUp, Wallet } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { useFilters, unique, currency } from "@/lib/use-filters";
import { Card } from "@/components/ui/card";
import {
  sales,
  payrollWeeks,
  payables,
  commissionTiers,
  commissionPerSale,
  AGENT_NAMES,
} from "@/lib/company-data";

export const Route = createFileRoute("/_shell/commissions")({
  head: () => ({
    meta: [
      { title: "Commissions — Policy Bear CRM" },
      {
        name: "description",
        content: "Monthly commission engine with tier ladder, personal lead incentives, and payable status.",
      },
      { property: "og:title", content: "Commissions — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Monthly commission engine with tier ladder, personal lead incentives, and payable status.",
      },
    ],
  }),
  component: CommissionsPage,
});

function monthOf(dateStr: string | null) {
  return dateStr ? dateStr.slice(0, 7) : "unknown";
}

interface AgentMonthRow {
  key: string;
  agent: string;
  month: string;
  validSales: number;
  tierLabel: string;
  perSale: number;
  commissionDue: number;
  personalLeadIncentive: number;
  endMonthPayable: number;
  payableStatus: string;
  weeks: string[];
}

function tierLabelFor(count: number) {
  const t = commissionTiers.find((t) => count >= t.min && count <= t.max);
  if (!t) return "—";
  const max = t.max >= 9999 ? "40+" : `${t.min}-${t.max}`;
  return `${max} → $${t.perSale}`;
}

const months = Array.from(new Set(payrollWeeks.map((w) => w.weekStart.slice(0, 7)))).sort();
const weekStarts = Array.from(new Set(payrollWeeks.map((w) => w.weekStart))).sort();

function buildAgentMonthRows(): AgentMonthRow[] {
  const rows: AgentMonthRow[] = [];
  for (const agent of AGENT_NAMES) {
    for (const month of months) {
      const weeks = payrollWeeks.filter((w) => w.agent === agent && w.weekStart.startsWith(month));
      if (weeks.length === 0) continue;
      const validSales = weeks.reduce((s, w) => s + w.validSales, 0);
      const commissionDue = weeks.reduce((s, w) => s + w.commissionDue, 0);
      const incentiveDue = weeks.reduce((s, w) => s + w.incentiveDue, 0);
      const endMonthPayable = weeks.reduce((s, w) => s + w.endMonthPayable, 0);
      const perSale = commissionPerSale(validSales);
      const payable = payables.find(
        (p) => p.category === "Commissions & Incentives" && p.month === month && p.notes?.includes(agent),
      );
      const anyPayable = payables.find((p) => p.category === "Commissions & Incentives" && p.month === month);
      rows.push({
        key: `${agent}-${month}`,
        agent,
        month,
        validSales,
        tierLabel: tierLabelFor(validSales),
        perSale,
        commissionDue,
        personalLeadIncentive: incentiveDue,
        endMonthPayable,
        payableStatus: (payable ?? anyPayable)?.status ?? "Pending review",
        weeks: weeks.map((w) => w.weekStart),
      });
    }
  }
  return rows;
}

const agentMonthRows = buildAgentMonthRows();

function CommissionsPage() {
  const [weekFilter, setWeekFilter] = useState("all");

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(agentMonthRows, {
    searchFields: (r) => [r.agent, r.month],
    filters: {
      agent: (r) => r.agent,
      month: (r) => r.month,
    },
  });

  const rowsAfterWeek = useMemo(() => {
    if (weekFilter === "all") return filtered;
    return filtered.filter((r) => r.weeks.includes(weekFilter));
  }, [filtered, weekFilter]);

  const commissionPayables = payables.filter((p) => p.category === "Commissions & Incentives");
  const paidCount = commissionPayables.filter((p) => p.status === "Paid").length;

  const totalValidSales = rowsAfterWeek.reduce((s, r) => s + r.validSales, 0);
  const totalCommissionDue = rowsAfterWeek.reduce((s, r) => s + r.commissionDue, 0);
  const totalIncentive = rowsAfterWeek.reduce((s, r) => s + r.personalLeadIncentive, 0);

  const columns: Column<AgentMonthRow>[] = [
    {
      key: "agent",
      header: "Agent",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.agent}</p>
          <p className="text-xs text-muted-foreground">{r.month}</p>
        </div>
      ),
    },
    { key: "validSales", header: "Valid sales", cell: (r) => <span className="tabular">{r.validSales}</span>, align: "center" },
    { key: "tier", header: "Tier reached", cell: (r) => <span>{r.tierLabel}</span> },
    { key: "perSale", header: "Rate/sale", cell: (r) => <span className="tabular">{currency(r.perSale)}</span>, align: "right" },
    { key: "commissionDue", header: "Commission due", cell: (r) => <span className="tabular font-semibold text-foreground">{currency(r.commissionDue, 2)}</span>, align: "right" },
    { key: "incentive", header: "Personal lead incentive", cell: (r) => <span className="tabular">{currency(r.personalLeadIncentive, 2)}</span>, align: "right" },
    { key: "payable", header: "End-of-month payable", cell: (r) => <span className="tabular">{currency(r.endMonthPayable, 2)}</span>, align: "right" },
    { key: "status", header: "Payable status", cell: (r) => <StatusBadge status={r.payableStatus} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Commissions"
        description="Commissions are paid monthly after management review; base pay runs weekly through Gusto."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Valid sales (filtered)" value={totalValidSales} icon={<Layers className="size-4" />} tone="brand" />
        <StatCard label="Commission due" value={currency(totalCommissionDue, 2)} icon={<BadgeDollarSign className="size-4" />} tone="success" />
        <StatCard label="Personal lead incentives" value={currency(totalIncentive, 2)} icon={<TrendingUp className="size-4" />} tone="info" />
        <StatCard label="Commission payables paid" value={`${paidCount} / ${commissionPayables.length}`} icon={<Wallet className="size-4" />} tone="warning" />
      </div>

      <Card className="gap-3 p-4 shadow-card">
        <h2 className="text-sm font-semibold text-foreground">Commission tier ladder</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {commissionTiers.map((t) => (
            <div key={t.min} className="rounded-md border border-border bg-surface px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">{t.max >= 9999 ? `${t.min}+` : `${t.min}-${t.max}`} sales</p>
              <p className="text-sm font-semibold text-foreground">${t.perSale} / sale</p>
            </div>
          ))}
        </div>
      </Card>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search agent or month…"
        filters={[
          { key: "agent", label: "Agent", options: AGENT_NAMES as unknown as string[] },
          { key: "month", label: "Month", options: months },
        ]}
        values={values}
        onChange={(key, value) => setValue(key, value)}
        onReset={() => {
          reset();
          setWeekFilter("all");
        }}
        trailing={
          <select
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
          >
            <option value="all">All weeks</option>
            {weekStarts.map((w) => (
              <option key={w} value={w}>
                Week of {w}
              </option>
            ))}
          </select>
        }
      />

      <DataTable columns={columns} rows={rowsAfterWeek} empty="No commission activity for this selection." />
    </div>
  );
}
