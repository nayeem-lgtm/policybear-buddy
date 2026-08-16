import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, DollarSign, PhoneCall, Target } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildReport,
  derive,
  fmtDuration,
  fmtMoney,
  fmtPct,
  totalRow,
  type ReportDimension,
  type ReportRow,
} from "@/lib/reporting-metrics";

export const Route = createFileRoute("/_shell/reporting")({
  head: () => ({
    meta: [
      { title: "Reporting — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Publisher reporting grid: calls, connects, payable and billable volume, conversion, revenue, payout, profit and call duration in one scrollable row.",
      },
      { property: "og:title", content: "Reporting — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Publisher reporting grid: calls, connects, payable and billable volume, conversion, revenue, payout, profit and call duration in one scrollable row.",
      },
    ],
  }),
  component: ReportingPage,
});

const dimensions: { id: ReportDimension; label: string }[] = [
  { id: "publisher", label: "By publisher" },
  { id: "campaign", label: "By campaign" },
  { id: "day", label: "By day" },
];

type Tone = "plain" | "good" | "warn" | "bad" | "info";

interface Metric {
  key: string;
  header: string;
  value: (r: ReportRow) => string;
  tone?: (r: ReportRow) => Tone;
}

const toneClass: Record<Tone, string> = {
  plain: "text-foreground",
  good: "text-success",
  warn: "text-warning",
  bad: "text-destructive",
  info: "text-brand",
};

const metrics: Metric[] = [
  { key: "incoming", header: "Incoming", value: (r) => String(r.incoming) },
  { key: "live", header: "Live", value: (r) => String(r.live), tone: () => "good" },
  { key: "completed", header: "Completed", value: (r) => String(r.completed), tone: () => "info" },
  { key: "connects", header: "Connects", value: (r) => String(r.connects) },
  {
    key: "failed",
    header: "Failed Connects",
    value: (r) => String(r.failedConnects),
    tone: (r) => (r.failedConnects ? "bad" : "plain"),
  },
  { key: "connectPct", header: "Connect %", value: (r) => fmtPct(derive(r).connectPct) },
  { key: "payable", header: "Payable", value: (r) => String(r.payable) },
  { key: "payablePct", header: "Payable %", value: (r) => fmtPct(derive(r).payablePct) },
  { key: "billable", header: "Billable", value: (r) => String(r.billable), tone: () => "warn" },
  { key: "billablePct", header: "Billable %", value: (r) => fmtPct(derive(r).billablePct) },
  { key: "converted", header: "Converted", value: (r) => String(r.converted), tone: () => "warn" },
  {
    key: "conversion",
    header: "Conversion %",
    value: (r) => fmtPct(derive(r).conversionPct),
    tone: (r) => (derive(r).conversionPct >= 50 ? "good" : "bad"),
  },
  { key: "blocked", header: "Blocked", value: (r) => String(r.blocked) },
  { key: "duplicate", header: "Duplicate", value: (r) => String(r.duplicate) },
  { key: "revenue", header: "Revenue", value: (r) => fmtMoney(r.revenue) },
  { key: "payout", header: "Payout", value: (r) => fmtMoney(r.payout) },
  {
    key: "profit",
    header: "Profit",
    value: (r) => fmtMoney(r.profit),
    tone: (r) => (r.profit >= 0 ? "good" : "bad"),
  },
  {
    key: "margin",
    header: "Margin %",
    value: (r) => fmtPct(derive(r).marginPct),
    tone: (r) => (derive(r).marginPct >= 0 ? "good" : "bad"),
  },
  { key: "cpc", header: "CPC", value: (r) => fmtMoney(derive(r).cpc) },
  { key: "rpc", header: "RPC", value: (r) => fmtMoney(derive(r).rpc) },
  { key: "cpp", header: "CPP", value: (r) => fmtMoney(derive(r).cpp) },
  { key: "rpb", header: "RPB", value: (r) => fmtMoney(derive(r).rpb) },
  { key: "cps", header: "CPS", value: (r) => fmtMoney(derive(r).cps) },
  { key: "rps", header: "RPS", value: (r) => fmtMoney(derive(r).rps) },
  { key: "tcd", header: "TCD", value: (r) => fmtDuration(r.tcdSeconds) },
  { key: "acd", header: "ACD", value: (r) => fmtDuration(derive(r).acd) },
];

function ReportingPage() {
  const [dimension, setDimension] = useState<ReportDimension>("publisher");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => buildReport(dimension), [dimension]);
  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase())),
    [rows, search],
  );
  const totals = useMemo(() => totalRow(filtered), [filtered]);
  const t = derive(totals);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Publisher"
        title="Reporting"
        description="One row per publisher, campaign or day — scroll sideways for every call, conversion and money metric."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Incoming Calls" value={totals.incoming} hint={`${totals.connects} connected`} icon={<PhoneCall className="size-4" />} tone="brand" />
        <StatCard label="Converted" value={totals.converted} hint={fmtPct(t.conversionPct)} icon={<Target className="size-4" />} tone="info" />
        <StatCard label="Revenue" value={fmtMoney(totals.revenue)} hint={`${fmtMoney(totals.payout)} payout`} icon={<DollarSign className="size-4" />} tone="success" />
        <StatCard label="Profit" value={fmtMoney(totals.profit)} hint={`${fmtPct(t.marginPct)} margin`} icon={<BarChart3 className="size-4" />} tone={totals.profit >= 0 ? "success" : "warning"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border bg-card p-1">
          {dimensions.map((d) => (
            <Button
              key={d.id}
              size="sm"
              variant={dimension === d.id ? "default" : "ghost"}
              className="h-8"
              onClick={() => setDimension(d.id)}
            >
              {d.label}
            </Button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="h-9 w-full sm:w-64"
        />
      </div>

      <Card className="gap-0 overflow-hidden p-0 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-max min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface/80">
                <th className="sticky left-0 z-10 bg-surface/95 px-4 py-2.5 text-left text-[0.7rem] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase backdrop-blur">
                  {dimension === "day" ? "Date" : dimension === "campaign" ? "Campaign" : "Publisher"}
                </th>
                {metrics.map((m) => (
                  <th
                    key={m.key}
                    className="border-l border-border/60 px-4 py-2.5 text-right text-[0.7rem] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase"
                  >
                    {m.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={metrics.length + 1} className="py-12 text-center text-sm text-muted-foreground">
                    Nothing matches that search.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.key} className="border-t border-border/60 hover:bg-surface/50">
                  <td className="sticky left-0 z-10 bg-card/95 px-4 py-2.5 font-medium whitespace-nowrap text-foreground backdrop-blur">
                    {r.name}
                  </td>
                  {metrics.map((m) => (
                    <td
                      key={m.key}
                      className={cn(
                        "border-l border-border/40 px-4 py-2.5 text-right tabular whitespace-nowrap",
                        toneClass[m.tone?.(r) ?? "plain"],
                      )}
                    >
                      {m.value(r)}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length > 0 && (
                <tr className="border-t-2 border-border bg-surface/70 font-semibold">
                  <td className="sticky left-0 z-10 bg-surface/95 px-4 py-3 whitespace-nowrap text-foreground backdrop-blur">
                    Totals
                  </td>
                  {metrics.map((m) => (
                    <td
                      key={m.key}
                      className={cn(
                        "border-l border-border/40 px-4 py-3 text-right tabular whitespace-nowrap",
                        toneClass[m.tone?.(totals) ?? "plain"],
                      )}
                    >
                      {m.value(totals)}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          {filtered.length} rows · scroll sideways for all {metrics.length} metrics
        </div>
      </Card>
    </div>
  );
}
