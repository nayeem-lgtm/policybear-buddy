import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, LineChart as LineChartIcon, PiggyBank, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { currency } from "@/lib/use-filters";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { policies, revenueTrend, carriers } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/revenue")({
  head: () => ({
    meta: [
      { title: "Revenue — Policy Bear CRM" },
      { name: "description", content: "Revenue overview with MRR, trend chart, and breakdowns by carrier and campaign." },
      { property: "og:title", content: "Revenue — Policy Bear CRM" },
      { property: "og:description", content: "Revenue overview with MRR, trend chart, and breakdowns by carrier and campaign." },
    ],
  }),
  component: RevenuePage,
});

const ranges = ["Last 3 months", "Last 6 months", "Year to date"];

interface CarrierRevenue {
  carrier: string;
  policies: number;
  premium: number;
  commission: number;
}

interface CampaignRevenue {
  campaign: string;
  policies: number;
  premium: number;
  commission: number;
}

function RevenuePage() {
  const [range, setRange] = useState(ranges[1]!);

  const trend = useMemo(() => {
    if (range === "Last 3 months") return revenueTrend.slice(-3);
    if (range === "Last 6 months") return revenueTrend;
    return revenueTrend;
  }, [range]);

  const latest = revenueTrend[revenueTrend.length - 1]!;
  const prior = revenueTrend[revenueTrend.length - 2]!;
  const mrr = latest.revenue;
  const mrrDelta = (((mrr - prior.revenue) / prior.revenue) * 100).toFixed(1);
  const avgRevenuePerPolicy = mrr / policies.length;
  const netMargin = (((latest.revenue - latest.cost) / latest.revenue) * 100).toFixed(1);

  const byCarrier: CarrierRevenue[] = carriers.map((carrier) => {
    const rows = policies.filter((p) => p.carrier === carrier);
    return {
      carrier,
      policies: rows.length,
      premium: rows.reduce((s, p) => s + p.premium, 0),
      commission: rows.reduce((s, p) => s + p.commission, 0),
    };
  }).sort((a, b) => b.commission - a.commission);

  const campaigns = Array.from(new Set(policies.map((p) => p.source)));
  const byCampaign: CampaignRevenue[] = campaigns.map((campaign) => {
    const rows = policies.filter((p) => p.source === campaign);
    return {
      campaign,
      policies: rows.length,
      premium: rows.reduce((s, p) => s + p.premium, 0),
      commission: rows.reduce((s, p) => s + p.commission, 0),
    };
  }).sort((a, b) => b.commission - a.commission);

  const carrierColumns: Column<CarrierRevenue>[] = [
    { key: "carrier", header: "Carrier", cell: (r) => <span className="font-medium text-foreground">{r.carrier}</span> },
    { key: "policies", header: "Policies", cell: (r) => <span className="tabular">{r.policies}</span>, align: "center" },
    { key: "premium", header: "Premium", cell: (r) => <span className="tabular">{currency(r.premium)}</span>, align: "right" },
    { key: "commission", header: "Commission", cell: (r) => <span className="tabular font-medium">{currency(r.commission)}</span>, align: "right" },
  ];

  const campaignColumns: Column<CampaignRevenue>[] = [
    { key: "campaign", header: "Source / campaign", cell: (r) => <span className="font-medium text-foreground">{r.campaign}</span> },
    { key: "policies", header: "Policies", cell: (r) => <span className="tabular">{r.policies}</span>, align: "center" },
    { key: "premium", header: "Premium", cell: (r) => <span className="tabular">{currency(r.premium)}</span>, align: "right" },
    { key: "commission", header: "Commission", cell: (r) => <span className="tabular font-medium">{currency(r.commission)}</span>, align: "right" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Revenue"
        description="Company-wide revenue overview: recurring revenue trend, carrier mix, and campaign performance."
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-9 w-[11rem]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              {ranges.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="MRR"
          value={currency(mrr)}
          delta={{ value: `${mrrDelta}%`, direction: Number(mrrDelta) >= 0 ? "up" : "down" }}
          icon={<DollarSign className="size-4" />}
          tone="brand"
        />
        <StatCard label="Avg. revenue / policy" value={currency(avgRevenuePerPolicy, 0)} icon={<PiggyBank className="size-4" />} tone="info" />
        <StatCard label="Net margin" value={`${netMargin}%`} hint="this month" icon={<TrendingUp className="size-4" />} tone="success" />
        <StatCard label="Total cost" value={currency(latest.cost)} icon={<LineChartIcon className="size-4" />} tone="warning" />
      </div>

      <Card className="p-4 shadow-card">
        <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Revenue vs. cost trend</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip
                formatter={(value: number) => currency(value)}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--brand)" fill="url(#revFill)" strokeWidth={2} />
              <Area type="monotone" dataKey="cost" stroke="var(--muted-foreground)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Revenue by carrier</p>
          <DataTable columns={carrierColumns} rows={byCarrier} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Revenue by campaign</p>
          <DataTable columns={campaignColumns} rows={byCampaign} />
        </div>
      </div>
    </div>
  );
}
