import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Radio,
  PhoneCall,
  DollarSign,
  Timer,
  PhoneForwarded,
  BarChart3,
  Trophy,
  Coins,
  Tag,
} from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { publisherCps, trafficCalls, money, type CpsRow } from "@/lib/company-data";
import { fmtDuration } from "@/lib/reporting-metrics";
import { cn } from "@/lib/utils";
import { DateRangeTabs, presetLabel, type DateSelection } from "@/components/crm/DateRangeTabs";

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

const rankTone = {
  brand: { bar: "from-brand to-brand-cyan", chip: "bg-brand/10 text-brand" },
  success: { bar: "from-success to-brand-cyan", chip: "bg-success/12 text-success" },
  warning: { bar: "from-brand-yellow to-brand-orange", chip: "bg-warning/25 text-brand-tan" },
  info: { bar: "from-brand-teal to-brand-cyan", chip: "bg-brand-cyan/25 text-brand-teal" },
} as const;

type RankTone = keyof typeof rankTone;

function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function RankList({
  title,
  description,
  rows,
  icon,
  tone = "brand",
}: {
  title: string;
  description: string;
  rows: RankRow[];
  icon: ReactNode;
  tone?: RankTone;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.weight), 0) || 1;
  const total = rows.reduce((m, r) => m + r.weight, 0) || 1;
  const palette = rankTone[tone];

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border-border/70 p-0 shadow-card transition-shadow hover:shadow-raised">
      <CardHeader className="flex-row items-start gap-3 space-y-0 border-b border-border/60 bg-surface/50 px-5 py-4">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            palette.chip,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <CardTitle className="font-display text-base leading-tight">{title}</CardTitle>
          <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-border/50 p-0">
        {rows.length === 0 && (
          <p className="px-5 py-6 text-sm text-muted-foreground">No data yet.</p>
        )}
        {rows.map((row, i) => (
          <div
            key={row.name}
            className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface/60"
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold",
                i === 0 ? palette.chip : "bg-muted text-muted-foreground",
              )}
            >
              {initials(row.name) || i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium text-foreground">
                  <span className="mr-1.5 text-xs text-muted-foreground tabular">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {row.name}
                </span>
                <span className="shrink-0 text-right whitespace-nowrap">
                  <span className="tabular text-sm font-semibold text-foreground">
                    {row.value}
                  </span>
                  {row.sub && (
                    <span className="ml-2 text-xs text-muted-foreground">{row.sub}</span>
                  )}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent/70">
                  <div
                    className={cn("h-full rounded-full bg-gradient-to-r", palette.bar)}
                    style={{ width: `${Math.max(4, (row.weight / max) * 100)}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-[0.7rem] tabular text-muted-foreground">
                  {((row.weight / total) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PublisherDashboardPage() {
  const [dateSel, setDateSel] = useState<DateSelection>({ preset: "7d" });

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

  const byCps = useMemo<RankRow[]>(() => {
    const filtered = publisherCps.filter((p) => p.cps > 0);
    const maxCps = filtered.reduce((m, p) => Math.max(m, p.cps), 0) || 1;
    return [...filtered]
      .sort((a, b) => a.cps - b.cps)
      .slice(0, 8)
      .map((p) => ({
        name: p.name,
        value: money(p.cps),
        sub: `${money(p.payout)} payout`,
        // lower CPS is better → invert so the cheapest publisher gets the fullest bar
        weight: maxCps - p.cps,
      }));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Publisher"
        title="Dashboard"
        description="Call volume, connections and cost per sale across every publisher sending you traffic."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-card">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">{presetLabel(dateSel)}</span> across all
          publishers
        </p>
        <DateRangeTabs value={dateSel} onChange={setDateSel} className="border-0 bg-surface/70 shadow-none" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Live Calls"
          value={
            <span className="inline-flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
              </span>
              {stats.liveCalls}
            </span>
          }
          hint="Live now — updates in real time"
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
          icon={<BarChart3 className="size-4" />}
          tone="brand"
        />
        <RankList
          title="Top Publishers by Sales"
          description="Most valid sales produced"
          rows={bySales}
          icon={<Trophy className="size-4" />}
          tone="success"
        />
        <RankList
          title="Top Publishers by Highest Sales Value"
          description="Highest to lowest revenue"
          rows={byRevenue}
          icon={<Coins className="size-4" />}
          tone="warning"
        />
        <RankList
          title="Top Publishers by CPS"
          description="Cost per sale, lowest first"
          rows={byCps}
          icon={<Tag className="size-4" />}
          tone="info"
        />
      </div>
    </div>
  );
}
