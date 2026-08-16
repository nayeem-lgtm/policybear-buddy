import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Radio, PhoneCall, DollarSign, Timer, PhoneForwarded } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { publisherCps, trafficCalls, money, type CpsRow } from "@/lib/company-data";
import { fmtDuration } from "@/lib/reporting-metrics";

export const Route = createFileRoute("/_shell/publishers")({
  head: () => ({
    meta: [
      { title: "Publisher Dashboard — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Live publisher dashboard: live calls, total and connected calls, average duration, payout and top publishers by volume, sales and cost per sale.",
      },
      { property: "og:title", content: "Publisher Dashboard — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Live publisher dashboard: live calls, total and connected calls, average duration, payout and top publishers by volume, sales and cost per sale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublisherDashboardPage,
});

const AVG_CALL_SECONDS = 212;

interface RankRow {
  name: string;
  value: string;
  sub?: string;
  weight: number;
}

function RankList({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: RankRow[];
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.weight), 0) || 1;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
        {rows.map((row, i) => (
          <div key={row.name} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="w-5 shrink-0 text-xs font-semibold text-muted-foreground">
                  {i + 1}.
                </span>
                <span className="truncate font-medium text-foreground">{row.name}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="font-semibold text-foreground">{row.value}</span>
                {row.sub && (
                  <span className="ml-2 text-xs text-muted-foreground">{row.sub}</span>
                )}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.max(4, (row.weight / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PublisherDashboardPage() {
  const stats = useMemo(() => {
    const totalCalls = trafficCalls.length;
    const connected = publisherCps.reduce((s, p) => s + p.converted, 0);
    const totalPayout = publisherCps.reduce((s, p) => s + p.payout, 0);
    const liveCalls = publisherCps.filter((p) => p.converted > 60).length;
    return {
      liveCalls,
      totalCalls,
      connected,
      totalPayout,
      avgDuration: fmtDuration(AVG_CALL_SECONDS),
    };
  }, []);

  const callCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const call of trafficCalls) {
      if (!call.publisher) continue;
      map.set(call.publisher, (map.get(call.publisher) ?? 0) + 1);
    }
    return map;
  }, []);

  const byQuantity = useMemo<RankRow[]>(
    () =>
      [...callCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({
          name,
          value: `${count} calls`,
          weight: count,
        })),
    [callCounts],
  );

  const bySales = useMemo<RankRow[]>(
    () =>
      [...publisherCps]
        .sort((a, b) => b.validSales - a.validSales)
        .slice(0, 8)
        .map((p: CpsRow) => ({
          name: p.name,
          value: `${p.validSales} sales`,
          sub: `${p.converted} connected`,
          weight: p.validSales,
        })),
    [],
  );

  const byRevenue = useMemo<RankRow[]>(
    () =>
      [...publisherCps]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8)
        .map((p) => ({
          name: p.name,
          value: money(p.revenue),
          sub: `${p.validSales} sales`,
          weight: p.revenue,
        })),
    [],
  );

  const byCps = useMemo<RankRow[]>(
    () =>
      publisherCps
        .filter((p) => p.cps > 0)
        .sort((a, b) => b.cps - a.cps)
        .slice(0, 8)
        .map((p) => ({
          name: p.name,
          value: money(p.cps),
          sub: `${money(p.payout)} payout`,
          weight: p.cps,
        })),
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Publisher"
        title="Dashboard"
        description="Call volume, connections and cost per sale across every publisher sending you traffic."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Live Calls"
          value={stats.liveCalls}
          hint="Active right now"
          icon={<Radio className="size-4" />}
          tone="danger"
        />
        <StatCard
          label="Total Calls"
          value={stats.totalCalls.toLocaleString()}
          hint="All calls received"
          icon={<PhoneCall className="size-4" />}
          tone="brand"
        />
        <StatCard
          label="Connected Calls"
          value={stats.connected.toLocaleString()}
          hint="Reached an agent"
          icon={<PhoneForwarded className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Average Duration"
          value={stats.avgDuration}
          hint="Per connected call"
          icon={<Timer className="size-4" />}
          tone="info"
        />
        <StatCard
          label="Total Payout"
          value={money(stats.totalPayout)}
          hint="Paid to publishers"
          icon={<DollarSign className="size-4" />}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankList
          title="Top Publishers by Call Quantity"
          description="Who sends the most calls"
          rows={byQuantity}
        />
        <RankList
          title="Top Publishers by Sales"
          description="Most valid sales produced"
          rows={bySales}
        />
        <RankList
          title="Top Publishers by Highest Sales Value"
          description="Highest to lowest revenue"
          rows={byRevenue}
        />
        <RankList
          title="Top Publishers by CPS"
          description="Cost per sale, highest first"
          rows={byCps}
        />
      </div>
    </div>
  );
}
