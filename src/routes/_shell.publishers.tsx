import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Radio, PhoneCall, DollarSign, Gauge } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useFilters, unique } from "@/lib/use-filters";
import { publisherCps, sales, qaCalls, money, type CpsRow } from "@/lib/company-data";

export const Route = createFileRoute("/_shell/publishers")({
  head: () => ({
    meta: [
      { title: "Publishers — Policy Bear CRM" },
      { name: "description", content: "Publisher performance: converted calls, valid sales, CPS, revenue and payout across all lead sources." },
      { property: "og:title", content: "Publishers — Policy Bear CRM" },
      { property: "og:description", content: "Publisher performance: converted calls, valid sales, CPS, revenue and payout across all lead sources." },
    ],
  }),
  component: PublishersPage,
});

function cpsTone(cps: number) {
  if (cps > 150) return "danger" as const;
  if (cps > 100) return "warning" as const;
  return "success" as const;
}

function PublishersPage() {
  const [selected, setSelected] = useState<CpsRow | null>(null);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(publisherCps, {
    searchFields: (p) => [p.name],
    filters: {},
  });

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.payout - a.payout), [filtered]);

  const stats = useMemo(() => {
    const totalPayout = publisherCps.reduce((s, p) => s + p.payout, 0);
    const totalValidSales = publisherCps.reduce((s, p) => s + p.validSales, 0);
    const totalConverted = publisherCps.reduce((s, p) => s + p.converted, 0);
    const blendedCps = totalValidSales ? totalPayout / totalValidSales : 0;
    const over150 = publisherCps.filter((p) => p.cps > 150).length;
    return { totalPayout, totalValidSales, blendedCps, over150, totalConverted };
  }, []);

  const columns: Column<CpsRow>[] = [
    { key: "name", header: "Publisher", cell: (p) => <span className="font-medium text-foreground">{p.name}</span> },
    { key: "converted", header: "Converted Calls", align: "right", cell: (p) => p.converted },
    { key: "validSales", header: "Valid Sales", align: "right", cell: (p) => p.validSales },
    {
      key: "cps",
      header: "CPS",
      align: "right",
      cell: (p) => <StatusBadge status={money(p.cps)} tone={cpsTone(p.cps)} />,
    },
    { key: "revenue", header: "Revenue", align: "right", cell: (p) => money(p.revenue) },
    { key: "payout", header: "Payout", align: "right", cell: (p) => money(p.payout) },
    {
      key: "conv",
      header: "Conversion Rate",
      align: "right",
      cell: (p) => (p.converted ? `${((p.validSales / p.converted) * 100).toFixed(1)}%` : "—"),
    },
  ];

  const selectedSales = useMemo(
    () => (selected ? sales.filter((s) => s.publisher === selected.name) : []),
    [selected],
  );
  const selectedQa = useMemo(
    () => (selected ? qaCalls.filter((c) => c.publisher === selected.name) : []),
    [selected],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Traffic"
        title="Publishers"
        description="Lead publisher performance sourced from the July CPS workbook — CPS, payout and attributed sales."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Payout" value={money(stats.totalPayout)} hint="All publishers" icon={<DollarSign className="size-4" />} tone="success" />
        <StatCard label="Total Valid Sales" value={stats.totalValidSales} hint={`${stats.totalConverted} converted calls`} icon={<PhoneCall className="size-4" />} tone="brand" />
        <StatCard label="Blended CPS" value={money(stats.blendedCps)} hint="Payout / valid sales" icon={<Gauge className="size-4" />} tone="info" />
        <StatCard label="Publishers over $150 CPS" value={stats.over150} hint="Above target cost" icon={<Radio className="size-4" />} tone="warning" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search publisher…"
        filters={[]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable
        columns={columns}
        rows={sorted}
        onRowClick={(row) => setSelected(row)}
        footer={<span>{sorted.length} of {publisherCps.length} publishers shown, sorted by payout</span>}
      />

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.validSales} valid sales · {selected.converted} converted calls · {money(selected.cps)} CPS
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">Revenue</div>
                    <div className="font-medium text-foreground">{money(selected.revenue)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">Payout</div>
                    <div className="font-medium text-foreground">{money(selected.payout)}</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground uppercase">Attributed Sales ({selectedSales.length})</div>
                  <div className="space-y-2">
                    {selectedSales.length === 0 && <p className="text-sm text-muted-foreground">No sales rows matched this publisher name.</p>}
                    {selectedSales.map((s) => (
                      <div key={s.id} className="rounded-md border border-border bg-surface/60 p-2.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{s.customer}</span>
                          <span className="text-xs text-muted-foreground">{s.saleDate}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{s.agent}</span>
                          <span>·</span>
                          <span>{money(s.premium)}/mo</span>
                          {s.saleStatus && <StatusBadge status={s.saleStatus} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground uppercase">QA Calls ({selectedQa.length})</div>
                  <div className="space-y-2">
                    {selectedQa.length === 0 && <p className="text-sm text-muted-foreground">No QA calls logged for this publisher.</p>}
                    {selectedQa.slice(0, 8).map((c) => (
                      <div key={c.id} className="rounded-md border border-border bg-surface/60 p-2.5 text-sm">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{c.qaStatus}</Badge>
                          <span className="text-xs text-muted-foreground">{c.date}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
