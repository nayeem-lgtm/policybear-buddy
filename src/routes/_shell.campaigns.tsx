import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, DollarSign, Target, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useFilters } from "@/lib/use-filters";
import { campaignCps, trafficByDay, money, type CpsRow, type TrafficDay } from "@/lib/company-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — Policy Bear CRM" },
      { name: "description", content: "Ringba/CallGrid campaign performance against the 1-sale-per-2-paid-calls goal, with daily call volume." },
      { property: "og:title", content: "Campaigns — Policy Bear CRM" },
      { property: "og:description", content: "Ringba/CallGrid campaign performance against the 1-sale-per-2-paid-calls goal, with daily call volume." },
    ],
  }),
  component: CampaignsPage,
});

const GOAL_RATIO = 0.5; // 1 sale per 2 paid calls

function CampaignsPage() {
  const [selected, setSelected] = useState<CpsRow | null>(campaignCps[0] ?? null);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(campaignCps, {
    searchFields: (c) => [c.name],
    filters: {},
  });

  const stats = useMemo(() => {
    const totalPayout = campaignCps.reduce((s, c) => s + c.payout, 0);
    const totalValidSales = campaignCps.reduce((s, c) => s + c.validSales, 0);
    const totalConverted = campaignCps.reduce((s, c) => s + c.converted, 0);
    const blendedCps = totalValidSales ? totalPayout / totalValidSales : 0;
    const goalRatioActual = totalConverted ? totalValidSales / totalConverted : 0;
    return { totalPayout, totalValidSales, blendedCps, totalConverted, goalRatioActual };
  }, []);

  const columns: Column<CpsRow>[] = [
    { key: "name", header: "Campaign", cell: (c) => <span className="font-medium text-foreground">{c.name}</span> },
    { key: "converted", header: "Converted Calls", align: "right", cell: (c) => c.converted },
    { key: "validSales", header: "Valid Sales", align: "right", cell: (c) => c.validSales },
    { key: "cps", header: "CPS", align: "right", cell: (c) => money(c.cps) },
    { key: "revenue", header: "Revenue", align: "right", cell: (c) => money(c.revenue) },
    { key: "payout", header: "Payout", align: "right", cell: (c) => money(c.payout) },
    {
      key: "goal",
      header: "Vs. Goal",
      align: "right",
      cell: (c) => {
        const ratio = c.converted ? c.validSales / c.converted : 0;
        const meets = ratio >= GOAL_RATIO;
        return (
          <StatusBadge
            status={`${(ratio * 100).toFixed(1)}% (${meets ? "meets" : "below"})`}
            tone={meets ? "success" : "danger"}
          />
        );
      },
    },
  ];

  const dayRows = useMemo(() => {
    const relevant = selected
      ? trafficByDay.filter((d) => d.campaigns.includes(selected.name))
      : trafficByDay;
    return relevant;
  }, [selected]);

  const maxCalls = Math.max(1, ...dayRows.map((d) => d.calls));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Traffic"
        title="Campaigns"
        description="Final Expense Transfer Ringba/CallGrid campaigns, CPS economics and daily call volume against the sales goal."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Payout" value={money(stats.totalPayout)} hint="All campaigns" icon={<DollarSign className="size-4" />} tone="success" />
        <StatCard label="Total Valid Sales" value={stats.totalValidSales} hint={`${stats.totalConverted} converted calls`} icon={<Megaphone className="size-4" />} tone="brand" />
        <StatCard label="Blended CPS" value={money(stats.blendedCps)} hint="Payout / valid sales" icon={<TrendingUp className="size-4" />} tone="info" />
        <StatCard
          label="Goal: 1 Sale / 2 Paid Calls"
          value={`${(stats.goalRatioActual * 100).toFixed(1)}%`}
          hint={stats.goalRatioActual >= GOAL_RATIO ? "Meeting goal" : "Below 50% target"}
          icon={<Target className="size-4" />}
          tone={stats.goalRatioActual >= GOAL_RATIO ? "success" : "warning"}
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search campaign…"
        filters={[]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => setSelected(row)}
        footer={<span>{filtered.length} of {campaignCps.length} campaigns shown · click a row to filter daily volume</span>}
      />

      <div className="rounded-lg border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Daily Call Volume{selected ? ` — ${selected.name}` : ""}
          </h3>
          {selected && (
            <Badge variant="outline" className="cursor-pointer" onClick={() => setSelected(null)}>
              Clear campaign filter
            </Badge>
          )}
        </div>
        <div className="space-y-1.5">
          {dayRows.map((d) => {
            const ratio = d.calls ? d.sales / d.calls : 0;
            const meetsGoal = ratio >= GOAL_RATIO;
            return (
              <div key={d.date} className="flex items-center gap-3 text-xs">
                <span className="w-20 shrink-0 text-muted-foreground">{d.date}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                  <div
                    className={cn("h-full rounded-full", meetsGoal ? "bg-success" : "bg-warning")}
                    style={{ width: `${Math.max(4, (d.calls / maxCalls) * 100)}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-muted-foreground">{d.calls} calls</span>
                <span className="w-16 shrink-0 text-right text-muted-foreground">{d.sales} sales</span>
                <StatusBadge status={meetsGoal ? "On goal" : "Below goal"} tone={meetsGoal ? "success" : "danger"} className="w-20 justify-center" />
              </div>
            );
          })}
          {dayRows.length === 0 && <p className="text-sm text-muted-foreground">No traffic days recorded for this campaign.</p>}
        </div>
      </div>
    </div>
  );
}
