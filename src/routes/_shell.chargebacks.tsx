import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Banknote, RotateCcw, TimerReset } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { useFilters, unique, currency } from "@/lib/use-filters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sales, payrollWeeks, commissionPerSale } from "@/lib/company-data";

export const Route = createFileRoute("/_shell/chargebacks")({
  head: () => ({
    meta: [
      { title: "Chargebacks — Policy Bear CRM" },
      {
        name: "description",
        content: "Chargeback, cancellation, and high-risk-payment watchlist with commission clawback exposure.",
      },
      { property: "og:title", content: "Chargebacks — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Chargeback, cancellation, and high-risk-payment watchlist with commission clawback exposure.",
      },
    ],
  }),
  component: ChargebacksPage,
});

type LocalStatus = "Open" | "Recovered" | "Written Off" | "Disputed";

interface ChargebackRow {
  id: string;
  saleDate: string;
  customer: string;
  agent: string;
  carrier: string | null;
  policyAmount: number;
  premium: number;
  paymentMethod: string | null;
  risk: string | null;
  status: string | null;
  paymentStatus: string | null;
  clawback: number;
  bucket: "Chargeback" | "Watchlist";
  localStatus: LocalStatus;
}

function agentTierClawback(agent: string) {
  const weeks = payrollWeeks.filter((w) => w.agent === agent);
  const validSales = weeks.reduce((s, w) => s + w.validSales, 0);
  return commissionPerSale(validSales || 1);
}

function buildRows(): ChargebackRow[] {
  const rows: ChargebackRow[] = [];
  for (const s of sales) {
    const isBadStatus = ["Cancelled", "Chargeback", "Rejected"].includes(s.saleStatus ?? "");
    const isBadPayment = ["Missed Payment", "Cancelled", "Chargeback"].includes(s.paymentStatus ?? "");
    const isWatch = s.paymentRisk === "High cancellation risk" && s.paymentStatus === "Pending First Payment";
    if (!isBadStatus && !isBadPayment && !isWatch) continue;
    rows.push({
      id: s.id,
      saleDate: s.saleDate,
      customer: s.customer,
      agent: s.agent,
      carrier: s.carrier,
      policyAmount: s.policyAmount,
      premium: s.premium,
      paymentMethod: s.paymentMethod,
      risk: s.paymentRisk,
      status: s.saleStatus,
      paymentStatus: s.paymentStatus,
      clawback: agentTierClawback(s.agent),
      bucket: isWatch && !isBadStatus && !isBadPayment ? "Watchlist" : "Chargeback",
      localStatus: isBadStatus || isBadPayment ? "Open" : "Open",
    });
  }
  return rows;
}

const initialRows = buildRows();

function ChargebacksPage() {
  const [rows, setRows] = useState(initialRows);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(rows, {
    searchFields: (r) => [r.customer, r.agent, r.carrier ?? ""],
    filters: {
      bucket: (r) => r.bucket,
      agent: (r) => r.agent,
      localStatus: (r) => r.localStatus,
    },
  });

  const chargebackRows = rows.filter((r) => r.bucket === "Chargeback");
  const watchlistRows = rows.filter((r) => r.bucket === "Watchlist");

  const totalChargebacks = chargebackRows.length;
  const highRiskPendingPremium = watchlistRows.reduce((s, r) => s + r.premium, 0);
  const clawbackExposure = chargebackRows.reduce((s, r) => s + r.clawback, 0);
  const recoveredCount = rows.filter((r) => r.localStatus === "Recovered").length;
  const recoveryRate = chargebackRows.length ? Math.round((recoveredCount / chargebackRows.length) * 100) : 0;

  function updateStatus(id: string, localStatus: LocalStatus) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, localStatus } : r)));
  }

  const columns: Column<ChargebackRow>[] = [
    {
      key: "sale",
      header: "Sale",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.customer}</p>
          <p className="text-xs text-muted-foreground">{r.saleDate} · {r.agent}</p>
        </div>
      ),
    },
    { key: "carrier", header: "Carrier", cell: (r) => r.carrier ?? "—" },
    { key: "policyAmount", header: "Policy amount", cell: (r) => <span className="tabular">{currency(r.policyAmount)}</span>, align: "right" },
    { key: "premium", header: "Monthly premium", cell: (r) => <span className="tabular">{currency(r.premium, 2)}</span>, align: "right" },
    { key: "paymentMethod", header: "Payment method", cell: (r) => r.paymentMethod ?? "—" },
    { key: "risk", header: "Risk", cell: (r) => <StatusBadge status={r.risk ?? "—"} tone={r.risk === "High cancellation risk" ? "danger" : "muted"} /> },
    { key: "status", header: "Sale/payment status", cell: (r) => <StatusBadge status={r.status ?? r.paymentStatus ?? "—"} /> },
    { key: "clawback", header: "Commission clawback", cell: (r) => <span className="tabular text-destructive">-{currency(r.clawback)}</span>, align: "right" },
    {
      key: "actions",
      header: "Action",
      cell: (r) => (
        <div className="flex flex-wrap justify-end gap-1">
          <Button size="sm" variant={r.localStatus === "Recovered" ? "default" : "outline"} onClick={() => updateStatus(r.id, "Recovered")}>
            Recovered
          </Button>
          <Button size="sm" variant={r.localStatus === "Written Off" ? "default" : "outline"} onClick={() => updateStatus(r.id, "Written Off")}>
            Write off
          </Button>
          <Button size="sm" variant={r.localStatus === "Disputed" ? "default" : "outline"} onClick={() => updateStatus(r.id, "Disputed")}>
            Dispute
          </Button>
        </div>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Chargebacks"
        description="Cancellations, missed payments, and the high-cancellation-risk watchlist with clawback exposure."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Chargebacks / cancellations" value={totalChargebacks} icon={<Banknote className="size-4" />} tone="brand" />
        <StatCard label="High-risk pending premium" value={currency(highRiskPendingPremium, 2)} hint={`${watchlistRows.length} pending sales`} icon={<AlertTriangle className="size-4" />} tone="warning" />
        <StatCard label="Clawback exposure" value={currency(clawbackExposure)} icon={<TimerReset className="size-4" />} tone="danger" />
        <StatCard label="Recovery rate" value={`${recoveryRate}%`} icon={<RotateCcw className="size-4" />} tone="success" />
      </div>

      <Card className="gap-1 p-4 shadow-card">
        <p className="text-sm text-foreground">
          <span className="font-medium">Direct Billing</span> carries a high cancellation risk versus{" "}
          <span className="font-medium">Bank Draft/ACH (Preferred)</span>. Sales on Direct Billing that are still
          pending first payment are flagged below for proactive follow-up before they convert to chargebacks.
        </p>
      </Card>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customer, agent, carrier…"
        filters={[
          { key: "bucket", label: "Type", options: unique(rows, (r) => r.bucket) },
          { key: "agent", label: "Agent", options: unique(rows, (r) => r.agent) },
          { key: "localStatus", label: "Status", options: unique(rows, (r) => r.localStatus) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} empty="No chargebacks or at-risk sales for this filter." />
    </div>
  );
}
