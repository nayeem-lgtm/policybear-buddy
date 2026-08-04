import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, DollarSign, Users, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { useFilters, unique, currency } from "@/lib/use-filters";
import { publishers } from "@/lib/mock-data";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_shell/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — Policy Bear CRM" },
      {
        name: "description",
        content: "Campaign performance by source with spend, leads, conversion, ROI and trend.",
      },
      { property: "og:title", content: "Campaigns — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Campaign performance by source with spend, leads, conversion, ROI and trend.",
      },
    ],
  }),
  component: CampaignsPage,
});

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length] as T;
}

interface Campaign {
  id: string;
  name: string;
  source: string;
  spend: number;
  leads: number;
  conversion: string;
  roi: number;
  status: "Active" | "Paused";
  trend: number[];
}

const campaignNames = [
  "ACA Q3 Inbound",
  "U65 Retarget",
  "Medicare Spanish",
  "Open Enrollment",
  "Facebook Lead Gen",
  "Google Search — ACA",
  "SMS Reactivation",
  "Affiliate Network A",
];

let campaignsState: Campaign[] = Array.from({ length: 10 }, (_, i) => ({
  id: `CMPG-${300 + i}`,
  name: pick(campaignNames, i),
  source: pick(publishers, i).name,
  spend: 1200 + ((i * 733) % 9000),
  leads: 80 + ((i * 23) % 500),
  conversion: `${(4 + (i % 14)).toFixed(1)}%`,
  roi: Math.round((80 + ((i * 47) % 220)) - 100),
  status: i % 4 === 0 ? "Paused" : "Active",
  trend: Array.from({ length: 8 }, (_, j) => 20 + ((i * 13 + j * 29) % 80)),
}));

function CampaignsPage() {
  const [rows, setRows] = useState<Campaign[]>(campaignsState);

  const sourceOptions = useMemo(() => unique(rows, (c) => c.source), [rows]);
  const statusOptions = useMemo(() => unique(rows, (c) => c.status), [rows]);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(rows, {
    searchFields: (c) => [c.name, c.source],
    filters: {
      source: (c) => c.source,
      status: (c) => c.status,
    },
  });

  const activeCount = rows.filter((c) => c.status === "Active").length;
  const totalSpend = rows.reduce((s, c) => s + c.spend, 0);
  const totalLeads = rows.reduce((s, c) => s + c.leads, 0);
  const avgRoi = Math.round(rows.reduce((s, c) => s + c.roi, 0) / rows.length);

  function toggle(id: string) {
    setRows((r) =>
      r.map((c) => (c.id === id ? { ...c, status: c.status === "Active" ? "Paused" : "Active" } : c)),
    );
  }

  const columns: Column<Campaign>[] = [
    { key: "name", header: "Campaign", cell: (c) => <span className="font-medium text-foreground">{c.name}</span> },
    { key: "source", header: "Source", cell: (c) => <Badge variant="secondary">{c.source}</Badge> },
    { key: "spend", header: "Spend", cell: (c) => currency(c.spend), align: "right" },
    { key: "leads", header: "Leads", cell: (c) => c.leads, align: "right" },
    { key: "conversion", header: "Conversion", cell: (c) => c.conversion, align: "right" },
    {
      key: "roi",
      header: "ROI",
      cell: (c) => (
        <span className={c.roi >= 0 ? "text-success" : "text-destructive"}>
          {c.roi >= 0 ? "+" : ""}
          {c.roi}%
        </span>
      ),
      align: "right",
    },
    {
      key: "trend",
      header: "Trend",
      cell: (c) => (
        <div className="flex h-6 items-end gap-0.5">
          {c.trend.map((v, i) => (
            <span
              key={i}
              className="w-1.5 rounded-sm bg-brand/60"
              style={{ height: `${Math.max(10, v)}%` }}
            />
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => (
        <div className="flex items-center gap-2">
          <Switch checked={c.status === "Active"} onCheckedChange={() => toggle(c.id)} onClick={(e) => e.stopPropagation()} />
          <StatusBadge status={c.status} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Traffic"
        title="Campaigns"
        description="Campaign performance by source with spend, leads, conversion, ROI and quick status toggles."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Campaigns" value={activeCount} icon={<Megaphone className="size-4" />} />
        <StatCard label="Total Spend" value={currency(totalSpend)} icon={<DollarSign className="size-4" />} />
        <StatCard label="Total Leads" value={totalLeads} icon={<Users className="size-4" />} />
        <StatCard label="Avg. ROI" value={`${avgRoi}%`} tone={avgRoi >= 0 ? "success" : "danger"} icon={<TrendingUp className="size-4" />} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by campaign or source…"
        filters={[
          { key: "source", label: "Source", options: sourceOptions },
          { key: "status", label: "Status", options: statusOptions },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} footer={<span>{filtered.length} of {rows.length} campaigns</span>} />
    </div>
  );
}
