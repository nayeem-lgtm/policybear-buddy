import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/crm/PageHeader";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DateRangeTabs, type DateSelection } from "@/components/crm/DateRangeTabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { qaReviews, employees, type QAReview } from "@/lib/mock-data";
import { unique } from "@/lib/use-filters";
import {
  ChevronUp,
  ChevronDown,
  Filter,
  RotateCcw,
  Search,
  Check,
  X,
  LineChart as LineChartIcon,
} from "lucide-react";

export const Route = createFileRoute("/_shell/qa")({
  head: () => ({
    meta: [
      { title: "QA Review Queue — Policy Bear CRM" },
      { name: "description", content: "Quality review queue with scorecards, pass/fail decisions, and reviewer assignment." },
      { property: "og:title", content: "QA Review Queue — Policy Bear CRM" },
      { property: "og:description", content: "Quality review queue with scorecards, pass/fail decisions, and reviewer assignment." },
    ],
  }),
  component: QAPage,
});

const scorecardCriteria = [
  { label: "Consent captured", weight: 20 },
  { label: "Correct plan explanation", weight: 20 },
  { label: "Compliance disclosures read", weight: 25 },
  { label: "Verified identity & eligibility", weight: 20 },
  { label: "Call handling & tone", weight: 15 },
];

const ALL = "__all__";

function scoreTone(score: number) {
  return score >= 80 ? "success" : score >= 65 ? "warning" : "danger";
}

function ScorePill({ score }: { score: number }) {
  const tone = scoreTone(score);
  return (
    <Badge
      variant="outline"
      className={
        tone === "success"
          ? "border-success/25 bg-success/12 text-success"
          : tone === "warning"
            ? "border-warning/45 bg-warning/22 text-brand-tan"
            : "border-destructive/25 bg-destructive/12 text-destructive"
      }
    >
      <span className="mr-1 inline-block size-1.5 rounded-full bg-current" />
      {score}%
    </Badge>
  );
}

function YesNo({ value }: { value: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        value
          ? "border-success/25 bg-success/12 text-success"
          : "border-destructive/25 bg-destructive/12 text-destructive"
      }
    >
      {value ? "Yes" : "No"}
    </Badge>
  );
}

function Collapsible({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="gap-0 p-0 shadow-card">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          {icon}
          {title}
          {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </button>
        {right}
      </div>
      {open && <div className="border-t border-border/70 px-4 py-4">{children}</div>}
    </Card>
  );
}

function MetricChart({
  title,
  value,
  delta,
  data,
  color,
  suffix,
}: {
  title: string;
  value: string;
  delta: number;
  data: { day: string; v: number }[];
  color: string;
  suffix?: string;
}) {
  const up = delta >= 0;
  return (
    <Card className="gap-3 p-5 shadow-card">
      <div>
        <p className="font-display text-base font-semibold text-foreground">{title}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-display text-3xl font-semibold tracking-tight text-foreground tabular">{value}</span>
          <Badge
            variant="outline"
            className={up ? "border-success/25 bg-success/12 text-success" : "border-destructive/25 bg-destructive/12 text-destructive"}
          >
            {up ? "↑" : "↓"}{Math.abs(delta).toFixed(1)}%
          </Badge>
        </div>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(v: number) => `${v}${suffix ?? ""}`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.6rem",
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v}${suffix ?? ""}`, title]}
            />
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function QAPage() {
  const [selected, setSelected] = useState<QAReview | null>(null);
  const [reviewer, setReviewer] = useState<string>("");
  const [dateSel, setDateSel] = useState<DateSelection>({ preset: "7d" });
  const [search, setSearch] = useState("");
  const [fPublisher, setFPublisher] = useState(ALL);
  const [fAgent, setFAgent] = useState(ALL);
  const [fReviewer, setFReviewer] = useState(ALL);
  const [fOutcome, setFOutcome] = useState(ALL);

  const activeFilters = [fPublisher, fAgent, fReviewer, fOutcome].filter((v) => v !== ALL).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return qaReviews.filter((r) => {
      if (fPublisher !== ALL && r.publisher !== fPublisher) return false;
      if (fAgent !== ALL && r.agent !== fAgent) return false;
      if (fReviewer !== ALL && r.reviewer !== fReviewer) return false;
      if (fOutcome !== ALL && r.outcome !== fOutcome) return false;
      if (!q) return true;
      return [r.id, r.callId, r.agent, r.customer, r.publisher, r.reason]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [search, fPublisher, fAgent, fReviewer, fOutcome]);

  const charts = useMemo(() => {
    const days = ["Aug 11", "Aug 12", "Aug 13", "Aug 14", "Aug 15", "Aug 16", "Aug 17"];
    const buckets = days.map((day, i) => {
      const rows = filtered.filter((_, idx) => idx % days.length === i);
      const reviews = rows.length;
      const avg = reviews ? Math.round(rows.reduce((s, r) => s + r.score, 0) / reviews) : 0;
      const passed = rows.filter((r) => r.score >= 80).length;
      const invalid = rows.filter((r) => r.outcome === "Invalid").length;
      return {
        day,
        reviews,
        avg,
        pass: reviews ? Math.round((passed / reviews) * 100) : 0,
        invalid,
      };
    });
    const totalReviews = filtered.length;
    const avgScore = totalReviews
      ? Math.round(filtered.reduce((s, r) => s + r.score, 0) / totalReviews)
      : 0;
    const passRate = totalReviews
      ? Math.round((filtered.filter((r) => r.score >= 80).length / totalReviews) * 100)
      : 0;
    const invalidCount = filtered.filter((r) => r.outcome === "Invalid").length;
    const delta = (arr: number[]) => {
      const first = arr[0] || 1;
      const last = arr[arr.length - 1] || 0;
      const pct = ((last - first) / first) * 100;
      return Math.max(-99.9, Math.min(99.9, pct));
    };
    return {
      buckets,
      totalReviews,
      avgScore,
      passRate,
      invalidCount,
      dReviews: delta(buckets.map((b) => b.reviews)),
      dAvg: delta(buckets.map((b) => b.avg)),
      dPass: delta(buckets.map((b) => b.pass)),
      dInvalid: -delta(buckets.map((b) => b.invalid)),
    };
  }, [filtered]);

  const columns: Column<QAReview>[] = [
    { key: "id", header: "Review", cell: (r) => <span className="font-medium text-foreground">{r.id}</span> },
    { key: "submittedAt", header: "Submitted", cell: (r) => <span className="tabular text-muted-foreground">{r.submittedAt}</span> },
    { key: "callId", header: "Call ID", cell: (r) => <span className="tabular">{r.callId}</span> },
    { key: "outcome", header: "Outcome", cell: (r) => <StatusBadge status={r.outcome} /> },
    { key: "score", header: "QC Score", cell: (r) => <ScorePill score={r.score} /> },
    {
      key: "critical",
      header: "QC Critical",
      cell: (r) => (
        <span className="text-muted-foreground">
          {r.outcome === "Pending" ? "Not scored" : r.score >= 80 ? "Good" : r.score >= 65 ? "Fair" : "Poor"}
        </span>
      ),
    },
    { key: "conversion", header: "Conversion", cell: (r) => <YesNo value={r.outcome === "Valid"} /> },
    { key: "agent", header: "Agent", cell: (r) => r.agent },
    { key: "customer", header: "Customer", cell: (r) => r.customer },
    { key: "publisher", header: "Publisher", cell: (r) => <span className="text-muted-foreground">{r.publisher}</span> },
    { key: "reviewer", header: "Reviewer", cell: (r) => r.reviewer },
    { key: "recording", header: "Recording", cell: (r) => <YesNo value={r.recording} /> },
    { key: "reason", header: "Reason", cell: (r) => <span className="text-muted-foreground">{r.reason}</span> },
    { key: "deadline", header: "Deadline", cell: (r) => <span className="tabular">{r.deadline}</span> },
  ];

  const filterSelects: { label: string; value: string; set: (v: string) => void; options: string[] }[] = [
    { label: "Publishers", value: fPublisher, set: setFPublisher, options: unique(qaReviews, (r) => r.publisher) },
    { label: "Agents", value: fAgent, set: setFAgent, options: unique(qaReviews, (r) => r.agent) },
    { label: "Reviewers", value: fReviewer, set: setFReviewer, options: unique(qaReviews, (r) => r.reviewer) },
    { label: "Outcome", value: fOutcome, set: setFOutcome, options: unique(qaReviews, (r) => r.outcome) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Quality Control"
        title="QA Reviews"
        description="Score submitted calls against the compliance scorecard and assign reviewers."
        actions={
          <Link to="/qa/import">
            <Button size="sm" variant="outline">Smart QC Import</Button>
          </Link>
        }
      />

      <Card className="flex flex-col gap-3 p-3 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <DateRangeTabs value={dateSel} onChange={setDateSel} />
      </Card>

      <Collapsible
        title="Filters"
        icon={<Filter className="size-4 text-brand" />}
        right={
          <div className="flex items-center gap-2">
            {activeFilters > 0 && (
              <Badge variant="outline" className="border-brand/25 bg-brand/10 text-brand">{activeFilters}</Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={() => {
                setFPublisher(ALL);
                setFAgent(ALL);
                setFReviewer(ALL);
                setFOutcome(ALL);
                setSearch("");
              }}
            >
              <RotateCcw className="size-3.5" /> Reset
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {filterSelects.map((f) => (
            <Select key={f.label} value={f.value} onValueChange={f.set}>
              <SelectTrigger className="w-full">
                <span className="mr-1 text-muted-foreground">{f.label}:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      </Collapsible>

      <Collapsible title="Charts" icon={<LineChartIcon className="size-4 text-brand" />}>
        <div className="grid gap-4 xl:grid-cols-2">
          <MetricChart
            title="Reviews"
            value={`${charts.totalReviews}`}
            delta={charts.dReviews}
            data={charts.buckets.map((b) => ({ day: b.day, v: b.reviews }))}
            color="var(--brand)"
          />
          <MetricChart
            title="Average score"
            value={`${charts.avgScore}%`}
            delta={charts.dAvg}
            data={charts.buckets.map((b) => ({ day: b.day, v: b.avg }))}
            color="var(--brand-teal)"
            suffix="%"
          />
          <MetricChart
            title="Pass rate"
            value={`${charts.passRate}%`}
            delta={charts.dPass}
            data={charts.buckets.map((b) => ({ day: b.day, v: b.pass }))}
            color="var(--success)"
            suffix="%"
          />
          <MetricChart
            title="Invalid calls"
            value={`${charts.invalidCount}`}
            delta={charts.dInvalid}
            data={charts.buckets.map((b) => ({ day: b.day, v: b.invalid }))}
            color="var(--destructive)"
          />
        </div>
      </Collapsible>

      <Card className="gap-0 p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold text-foreground">Reviews</h2>
            <Badge variant="outline" className="border-brand/25 bg-brand/10 text-brand">
              {filtered.length} shown
            </Badge>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reviews, agents, calls…"
              className="rounded-full pl-9"
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          onRowClick={setSelected}
          footer={`${filtered.length} of ${qaReviews.length} reviews`}
          className="rounded-none border-0 border-t border-border/70 shadow-none"
        />
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.id} scorecard</SheetTitle>
                <SheetDescription>{selected.agent} · {selected.callId} · {selected.customer}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.outcome} />
                  <span className="text-sm text-muted-foreground">Reason: {selected.reason}</span>
                </div>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Scorecard breakdown</p>
                  <div className="space-y-3">
                    {scorecardCriteria.map((c, i) => {
                      const value = Math.min(100, Math.max(30, selected.score - i * 4 + (i % 2 ? 6 : -3)));
                      return (
                        <div key={c.label}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-foreground">{c.label}</span>
                            <span className="text-muted-foreground">{value}% · weight {c.weight}%</span>
                          </div>
                          <Progress value={value} />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">Assign reviewer</p>
                  <Select value={reviewer || selected.reviewer} onValueChange={setReviewer}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {employees.filter((e) => e.role === "QC").map((e) => (
                        <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-1.5"><X className="size-3.5" /> Fail</Button>
                  <Button className="flex-1 gap-1.5"><Check className="size-3.5" /> Pass</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
