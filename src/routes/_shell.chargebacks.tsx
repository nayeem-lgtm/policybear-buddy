import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Banknote, RotateCcw, TimerReset } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { useFilters, unique, currency } from "@/lib/use-filters";
import { Badge } from "@/components/ui/badge";
import { chargebacks } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/chargebacks")({
  head: () => ({
    meta: [
      { title: "Chargebacks — Policy Bear CRM" },
      { name: "description", content: "Chargeback and clawback tracker with aging buckets and recovery status." },
      { property: "og:title", content: "Chargebacks — Policy Bear CRM" },
      { property: "og:description", content: "Chargeback and clawback tracker with aging buckets and recovery status." },
    ],
  }),
  component: ChargebacksPage,
});

type Chargeback = (typeof chargebacks)[number];

function agingBucket(i: number): string {
  return ["0-30 days", "31-60 days", "61-90 days", "90+ days"][i % 4]!;
}

function ChargebacksPage() {
  const rows = useMemo(
    () => chargebacks.map((c, i) => ({ ...c, aging: agingBucket(i) })),
    [],
  );

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(rows, {
    searchFields: (r) => [r.policyNumber, r.customer, r.agent, r.carrier],
    filters: {
      status: (r) => r.status,
      carrier: (r) => r.carrier,
      aging: (r) => r.aging,
    },
  });

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const recovered = rows.filter((r) => r.status === "Recovered").reduce((s, r) => s + r.amount, 0);
  const pending = rows.filter((r) => r.status === "Pending").length;
  const writtenOff = rows.filter((r) => r.status === "Written Off").reduce((s, r) => s + r.amount, 0);

  const columns: Column<Chargeback & { aging: string }>[] = [
    {
      key: "policy",
      header: "Policy",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.policyNumber}</p>
          <p className="text-xs text-muted-foreground">{r.customer}</p>
        </div>
      ),
    },
    { key: "agent", header: "Agent", cell: (r) => r.agent },
    { key: "carrier", header: "Carrier", cell: (r) => <Badge variant="secondary">{r.carrier}</Badge> },
    { key: "reason", header: "Reason", cell: (r) => r.reason },
    { key: "amount", header: "Amount", cell: (r) => <span className="tabular font-medium">{currency(r.amount)}</span>, align: "right" },
    { key: "aging", header: "Aging", cell: (r) => <StatusBadge status={r.aging} tone={r.aging === "90+ days" ? "danger" : r.aging === "61-90 days" ? "warning" : "muted"} /> },
    { key: "status", header: "Recovery status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Chargebacks"
        description="Track carrier chargebacks and agent clawbacks through recovery, write-off, or dispute."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total chargebacks" value={currency(total)} hint={`${rows.length} records`} icon={<Banknote className="size-4" />} tone="brand" />
        <StatCard label="Recovered" value={currency(recovered)} icon={<RotateCcw className="size-4" />} tone="success" />
        <StatCard label="Pending" value={pending} hint="awaiting recovery" icon={<TimerReset className="size-4" />} tone="warning" />
        <StatCard label="Written off" value={currency(writtenOff)} icon={<AlertTriangle className="size-4" />} tone="danger" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search policy, customer, agent…"
        filters={[
          { key: "status", label: "Status", options: unique(rows, (r) => r.status) },
          { key: "carrier", label: "Carrier", options: unique(rows, (r) => r.carrier) },
          { key: "aging", label: "Aging", options: unique(rows, (r) => r.aging) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} />
    </div>
  );
}
