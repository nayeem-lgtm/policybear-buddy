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
  FastForward,
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
    <Card className="gap-2 p-4 shadow-card">
      <div>
        <p className="font-display text-sm font-semibold text-foreground">{title}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="font-display text-xl font-semibold tracking-tight text-foreground tabular">{value}</span>
          <Badge
            variant="outline"
            className={
              up
                ? "border-success/25 bg-success/12 px-1.5 py-0 text-[0.65rem] text-success"
                : "border-destructive/25 bg-destructive/12 px-1.5 py-0 text-[0.65rem] text-destructive"
            }
          >
            {up ? "↑" : "↓"}{Math.abs(delta).toFixed(1)}%
          </Badge>
        </div>
      </div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={38}
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickFormatter={(v: number) => `${prefix ?? ""}${v}${suffix ?? ""}`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.6rem",
                fontSize: 12,
              }}
              formatter={(v: number) => [`${prefix ?? ""}${v}${suffix ?? ""}`, title]}
            />
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}


type QARow = QAReview & {
  timestamp: string;
  phone: string;
  callStatus: "Completed" | "Skipped" | "In Progress";
  validSale: "Valid" | "Invalid" | "Detailed" | "-";
  campaign: string;
  buyer: string;
  target: string;
  revenue: number;
  payout: number;
  answer: number;
  transcript: boolean;
  summary: boolean;
  endCallSource: string;
  duration: string;
  duplicate: boolean;
  fakeCustomer: boolean;
  flag: string;
  auditedBy: string;
  comment: string;
  rtbBidId: string;
};

const CAMPAIGNS = [
  "Garage Door Inbound RTB (7504)",
  "Appliance Repair RTB (8016)",
  "HVAC Inbound RTB (5559)",
  "Plumbing Inbound RTB (5552)",
  "Bathroom Remodeling Revshare (5176)",
];
const TARGETS = ["Garage-MW-IB", "Appliance-RM-IB", "HVAC-OHP-IB", "Plumbing-O2G-IB", "Bath-IU-IB"];

function pad(n: number, w = 2) {
  return String(n).padStart(w, "0");
}

function enrich(r: QAReview, i: number): QARow {
  const skipped = i % 4 === 0;
  const secs = skipped ? 3 + (i % 25) : 60 + ((i * 37) % 240);
  const conv = r.outcome === "Valid";
  return {
    ...r,
    timestamp: `08/${17 - (i % 4)} ${pad((i * 5) % 24)}:${pad((i * 13) % 60)}:${pad((i * 29) % 60)}`,
    phone: `+1 ${200 + (i * 17) % 700}-${100 + (i * 31) % 899}-${pad((i * 977) % 10000, 4)}`,
    callStatus: skipped ? "Skipped" : "Completed",
    validSale: r.outcome === "Valid" ? "Valid" : r.outcome === "Pending" ? "-" : r.outcome === "Disputed" ? "Detailed" : "Invalid",
    campaign: CAMPAIGNS[i % CAMPAIGNS.length]!,
    buyer: `${460 + ((i * 23) % 200)}`,
    target: TARGETS[i % TARGETS.length]!,

    revenue: conv ? Math.round((5 + (i * 7.3) % 40) * 100) / 100 : 0,
    payout: conv ? Math.round((4 + (i * 6.1) % 32) * 100) / 100 : 0,
    answer: skipped ? i % 10 : 40 + ((i * 19) % 220),
    transcript: !skipped,
    summary: !skipped && i % 5 !== 2,
    endCallSource: "caller",
    duration: `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`,
    duplicate: i % 11 === 0,
    fakeCustomer: i % 17 === 0,
    flag: "-",
    auditedBy: r.outcome === "Pending" ? "-" : r.reviewer,
    comment: i % 6 === 0 ? r.reason : "",
    rtbBidId: `cmsw${(i * 7919).toString(36)}${(i * 104729).toString(36)}`,
  };
}

const qaRows: QARow[] = qaReviews.map(enrich);

function Dash() {
  return <span className="text-muted-foreground">–</span>;
}

function BoolMark({ value }: { value: boolean }) {
  return value ? (
    <Check className="size-4 text-success" />
  ) : (
    <X className="size-4 text-destructive/70" />
  );
}

function CallStatusCell({ status }: { status: QARow["callStatus"] }) {
  if (status === "Skipped")
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <FastForward className="size-3.5" /> Skipped
      </span>
    );
  return (
    <Badge variant="outline" className="border-success/25 bg-success/12 text-success">
      {status}
    </Badge>
  );
}

function ValidSaleCell({ v }: { v: QARow["validSale"] }) {
  if (v === "-") return <Dash />;
  return (
    <Badge
      variant="outline"
      className={
        v === "Valid"
          ? "border-success/30 bg-success/10 text-success"
          : v === "Detailed"
            ? "border-warning/45 bg-warning/15 text-brand-tan"
            : "border-destructive/30 bg-destructive/10 text-destructive"
      }
    >
      {v}
    </Badge>
  );
}

const money = (n: number) => `$${n.toFixed(2)}`;

function QAPage() {
  const [selected, setSelected] = useState<QARow | null>(null);
  const [reviewer, setReviewer] = useState<string>("");
  const [dateSel, setDateSel] = useState<DateSelection>({ preset: "7d" });
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [fPublisher, setFPublisher] = useState(ALL);
  const [fAgent, setFAgent] = useState(ALL);
  const [fReviewer, setFReviewer] = useState(ALL);
  const [fOutcome, setFOutcome] = useState(ALL);
  const [fStatus, setFStatus] = useState(ALL);

  const activeFilters =
    [fPublisher, fAgent, fReviewer, fOutcome, fStatus].filter((v) => v !== ALL).length +
    (phone.trim() ? 1 : 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const p = phone.replace(/\D/g, "");
    return qaRows.filter((r) => {
      if (fPublisher !== ALL && r.publisher !== fPublisher) return false;
      if (fAgent !== ALL && r.agent !== fAgent) return false;
      if (fReviewer !== ALL && r.reviewer !== fReviewer) return false;
      if (fOutcome !== ALL && r.outcome !== fOutcome) return false;
      if (fStatus !== ALL && r.callStatus !== fStatus) return false;
      if (p && !r.phone.replace(/\D/g, "").includes(p)) return false;
      if (!q) return true;
      return [r.id, r.callId, r.agent, r.customer, r.publisher, r.reason, r.phone, r.campaign]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [search, phone, fPublisher, fAgent, fReviewer, fOutcome, fStatus]);

  const charts = useMemo(() => {
    const days = ["Aug 11", "Aug 12", "Aug 13", "Aug 14", "Aug 15", "Aug 16", "Aug 17"];
    const buckets = days.map((day, i) => {
      const rows = filtered.filter((_, idx) => idx % days.length === i);
      const reviews = rows.length;
      const avg = reviews ? Math.round(rows.reduce((s, r) => s + r.score, 0) / reviews) : 0;
      const passed = rows.filter((r) => r.score >= 80).length;
      const invalid = rows.filter((r) => r.outcome === "Invalid").length;
      return { day, reviews, avg, pass: reviews ? Math.round((passed / reviews) * 100) : 0, invalid };
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
      return Math.max(-99.9, Math.min(99.9, ((last - first) / first) * 100));
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

  const columns: Column<QARow>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      cell: (r) => <span className="tabular font-medium text-foreground">{r.timestamp}</span>,
      className: "sticky left-0 z-10 bg-card",
    },
    { key: "phone", header: "Inbound Phone", cell: (r) => <span className="tabular">{r.phone}</span> },
    { key: "status", header: "Status", cell: (r) => <CallStatusCell status={r.callStatus} /> },
    { key: "validSale", header: "Valid Sale", cell: (r) => <ValidSaleCell v={r.validSale} /> },
    { key: "publisher", header: "Publisher", cell: (r) => r.publisher },
    { key: "campaign", header: "Campaign", cell: (r) => r.campaign },
    { key: "buyer", header: "Buyer", cell: (r) => <span className="tabular">{r.buyer}</span> },
    { key: "target", header: "Target", cell: (r) => r.target },
    { key: "conversion", header: "Conversion", cell: (r) => <YesNo value={r.outcome === "Valid"} /> },
    { key: "score", header: "QC Score", cell: (r) => <ScorePill score={r.score} /> },
    {
      key: "critical",
      header: "QC Critical",
      cell: (r) =>
        r.outcome === "Pending" ? (
          <span className="text-muted-foreground">Not Scored</span>
        ) : (
          <Badge
            variant="outline"
            className={
              r.score >= 80
                ? "border-success/25 bg-success/12 text-success"
                : r.score >= 65
                  ? "border-warning/45 bg-warning/20 text-brand-tan"
                  : "border-destructive/25 bg-destructive/12 text-destructive"
            }
          >
            {r.score >= 80 ? "Good" : r.score >= 65 ? "Bad" : "POOR"}
          </Badge>
        ),
    },
    { key: "revenue", header: "Revenue", align: "right", cell: (r) => money(r.revenue) },
    { key: "payout", header: "Payout", align: "right", cell: (r) => money(r.payout) },
    { key: "answer", header: "Answer", align: "right", cell: (r) => <span className="tabular">{r.answer}</span> },
    { key: "recording", header: "Recording", cell: (r) => <YesNo value={r.recording} /> },
    { key: "transcript", header: "Transcript", cell: (r) => <YesNo value={r.transcript} /> },
    { key: "summary", header: "Summary", cell: (r) => <YesNo value={r.summary} /> },
    { key: "endCallSource", header: "End Call Source", cell: (r) => <span className="text-muted-foreground">{r.endCallSource}</span> },
    { key: "duration", header: "Duration", cell: (r) => <span className="tabular">{r.duration}</span> },
    { key: "duplicate", header: "Duplicate", align: "center", cell: (r) => <BoolMark value={r.duplicate} /> },
    { key: "fake", header: "Fake Customer", align: "center", cell: (r) => <BoolMark value={r.fakeCustomer} /> },
    { key: "flag", header: "Flag", cell: () => <Dash /> },
    { key: "auditedBy", header: "Audited By", cell: (r) => (r.auditedBy === "-" ? <Dash /> : r.auditedBy) },
    { key: "comment", header: "Comment", cell: (r) => (r.comment ? <span className="text-muted-foreground">{r.comment}</span> : <Dash />) },
    { key: "rtb", header: "RTBBidID", cell: (r) => <span className="tabular text-muted-foreground">{r.rtbBidId}</span> },
  ];

  const filterSelects: { label: string; value: string; set: (v: string) => void; options: string[] }[] = [
    { label: "Publishers", value: fPublisher, set: setFPublisher, options: unique(qaRows, (r) => r.publisher) },
    { label: "Status", value: fStatus, set: setFStatus, options: unique(qaRows, (r) => r.callStatus) },
    { label: "Agents", value: fAgent, set: setFAgent, options: unique(qaRows, (r) => r.agent) },
    { label: "Reviewers", value: fReviewer, set: setFReviewer, options: unique(qaRows, (r) => r.reviewer) },
    { label: "Outcome", value: fOutcome, set: setFOutcome, options: unique(qaRows, (r) => r.outcome) },
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
                setFStatus(ALL);
                setPhone("");
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
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number…"
            inputMode="tel"
          />
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
          footer={`${filtered.length} of ${qaRows.length} calls`}
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
