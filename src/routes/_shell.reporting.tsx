import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, DollarSign, PhoneCall, Search, Target } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DateRangeTabs, presetLabel, type DateSelection } from "@/components/crm/DateRangeTabs";
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
  const [dateSel, setDateSel] = useState<DateSelection>({ preset: "7d" });
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-card">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{presetLabel(dateSel)}</span>
        </p>
        <DateRangeTabs
          value={dateSel}
          onChange={setDateSel}
          className="border-0 bg-surface/70 shadow-none"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Incoming Calls" value={totals.incoming} hint={`${totals.connects} connected`} icon={<PhoneCall className="size-4" />} tone="brand" />
        <StatCard label="Converted" value={totals.converted} hint={fmtPct(t.conversionPct)} icon={<Target className="size-4" />} tone="info" />
        <StatCard label="Revenue" value={fmtMoney(totals.revenue)} hint={`${fmtMoney(totals.payout)} payout`} icon={<DollarSign className="size-4" />} tone="success" />
        <StatCard label="Profit" value={fmtMoney(totals.profit)} hint={`${fmtPct(t.marginPct)} margin`} icon={<BarChart3 className="size-4" />} tone={totals.profit >= 0 ? "success" : "warning"} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-card">
        <div className="inline-flex items-center gap-1 rounded-full bg-surface/70 p-1">
          {dimensions.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDimension(d.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                dimension === d.id
                  ? "bg-brand text-brand-foreground shadow-brand"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rows…"
            className="h-9 rounded-full bg-surface/60 pl-9"
          />
        </div>
      </div>

      <Card className="gap-0 overflow-hidden p-0 shadow-card">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-max min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="bg-surface">
                <th className="sticky left-0 z-30 border-b border-border bg-surface px-4 py-3 text-left text-[0.68rem] font-semibold tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase">
                  {dimension === "day" ? "Date" : dimension === "campaign" ? "Campaign" : "Publisher"}
                </th>
                {metrics.map((m) => (
                  <th
                    key={m.key}
                    className="border-b border-l border-border/60 px-4 py-3 text-right text-[0.68rem] font-semibold tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase"
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
                <tr
                  key={r.key}
                  className="group border-t border-border/50 odd:bg-surface/25 hover:bg-brand/[0.06]"
                >
                  <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-medium whitespace-nowrap text-foreground group-odd:bg-[color-mix(in_oklab,var(--surface)_25%,var(--card))] group-hover:bg-[color-mix(in_oklab,var(--brand)_6%,var(--card))]">
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-brand/40" />
                      {r.name}
                    </span>
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
                <tr className="border-t-2 border-border bg-surface font-semibold">
                  <td className="sticky left-0 z-10 bg-surface px-4 py-3 whitespace-nowrap text-foreground">
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
        <div className="border-t border-border bg-surface/40 px-4 py-2.5 text-xs text-muted-foreground">
          {filtered.length} rows · scroll sideways for all {metrics.length} metrics
        </div>
      </Card>
    </div>
  );
}
