import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Radio, PhoneCall, DollarSign, Gauge } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { useFilters, unique, currency } from "@/lib/use-filters";
import { publishers, type Publisher } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_shell/publishers")({
  head: () => ({
    meta: [
      { title: "Publishers — Policy Bear CRM" },
      {
        name: "description",
        content: "Publisher and vendor performance with calls, valid rate, CPA, quality score and terms.",
      },
      { property: "og:title", content: "Publishers — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Publisher and vendor performance with calls, valid rate, CPA, quality score and terms.",
      },
    ],
  }),
  component: PublishersPage,
});

function qualityScore(p: Publisher) {
  const invalid = parseFloat(p.invalidRate);
  return Math.max(0, Math.round(100 - invalid * 4));
}

function cpa(p: Publisher) {
  return p.sales > 0 ? p.cost / p.sales : p.cost;
}

function PublishersPage() {
  const [selected, setSelected] = useState<Publisher | null>(null);

  const statusOptions = useMemo(() => unique(publishers, (p) => p.status), []);
  const termsOptions = useMemo(() => unique(publishers, (p) => p.payoutTerms), []);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(publishers, {
    searchFields: (p) => [p.name, p.contact],
    filters: {
      status: (p) => p.status,
      payoutTerms: (p) => p.payoutTerms,
    },
  });

  const activeCount = publishers.filter((p) => p.status === "Active").length;
  const totalCalls = publishers.reduce((s, p) => s + p.callsToday, 0);
  const avgQuality = Math.round(publishers.reduce((s, p) => s + qualityScore(p), 0) / publishers.length);
  const totalRevenue = publishers.reduce((s, p) => s + p.revenue, 0);

  const columns: Column<Publisher>[] = [
    { key: "name", header: "Publisher", cell: (p) => <span className="font-medium text-foreground">{p.name}</span> },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    { key: "calls", header: "Calls Today", cell: (p) => p.callsToday, align: "right" },
    { key: "conversion", header: "Valid Rate", cell: (p) => p.conversion, align: "right" },
    { key: "cpa", header: "CPA", cell: (p) => currency(cpa(p), 2), align: "right" },
    {
      key: "quality",
      header: "Quality Score",
      cell: (p) => (
        <Badge variant={qualityScore(p) >= 80 ? "default" : qualityScore(p) >= 60 ? "secondary" : "destructive"}>
          {qualityScore(p)}
        </Badge>
      ),
      align: "center",
    },
    { key: "terms", header: "Payment Terms", cell: (p) => p.payoutTerms },
    { key: "revenue", header: "Revenue", cell: (p) => currency(p.revenue), align: "right" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Traffic"
        title="Publishers"
        description="Publisher and vendor performance across calls, valid rate, CPA, quality score and payment terms."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Publishers" value={activeCount} icon={<Radio className="size-4" />} />
        <StatCard label="Calls Today" value={totalCalls} icon={<PhoneCall className="size-4" />} />
        <StatCard label="Avg. Quality Score" value={avgQuality} icon={<Gauge className="size-4" />} />
        <StatCard label="Revenue (MTD)" value={currency(totalRevenue)} tone="success" icon={<DollarSign className="size-4" />} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by publisher or contact…"
        filters={[
          { key: "status", label: "Status", options: statusOptions },
          { key: "payoutTerms", label: "Terms", options: termsOptions },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => setSelected(row)}
        footer={<span>{filtered.length} of {publishers.length} publishers</span>}
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>{selected.contact}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selected.status} />
                  <Badge variant="secondary">{selected.payoutTerms}</Badge>
                  <Badge variant="secondary">{selected.campaigns} campaigns</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Calls Today</dt>
                  <dd className="text-right">{selected.callsToday}</dd>
                  <dt className="text-muted-foreground">Paid Calls</dt>
                  <dd className="text-right">{selected.paidCalls}</dd>
                  <dt className="text-muted-foreground">Sales</dt>
                  <dd className="text-right">{selected.sales}</dd>
                  <dt className="text-muted-foreground">Conversion</dt>
                  <dd className="text-right">{selected.conversion}</dd>
                  <dt className="text-muted-foreground">Invalid Rate</dt>
                  <dd className="text-right">{selected.invalidRate}</dd>
                  <dt className="text-muted-foreground">CPA</dt>
                  <dd className="text-right">{currency(cpa(selected), 2)}</dd>
                  <dt className="text-muted-foreground">Cost</dt>
                  <dd className="text-right">{currency(selected.cost)}</dd>
                  <dt className="text-muted-foreground">Revenue</dt>
                  <dd className="text-right">{currency(selected.revenue)}</dd>
                  <dt className="text-muted-foreground">Quality Score</dt>
                  <dd className="text-right">{qualityScore(selected)}</dd>
                </dl>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
