import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Download,
  ShieldQuestion,
  PieChart,
  Flag,
  MessageSquare,
  FileText,
  Sparkles,
  ChevronDown,
  Check,
  FastForward,
  Pencil,
} from "lucide-react";

export type CallDetail = {
  id: string;
  callId: string;
  agent: string;
  customer: string;
  publisher: string;
  reviewer: string;
  outcome: string;
  reason: string;
  score: number;
  timestamp: string;
  phone: string;
  callStatus: string;
  validSale: string;
  campaign: string;
  buyer: string;
  target: string;
  revenue: number;
  payout: number;
  transcript: boolean;
  summary: boolean;
  endCallSource: string;
  duration: string;
  duplicate: boolean;
  fakeCustomer: boolean;
  auditedBy: string;
  comment: string;
  rtbBidId: string;
};

const TABS = ["Overview", "Scoring", "Transcript"] as const;
type Tab = (typeof TABS)[number];

const scorecardCriteria = [
  { label: "Consent captured", weight: 20 },
  { label: "Correct plan explanation", weight: 20 },
  { label: "Compliance disclosures read", weight: 25 },
  { label: "Verified identity & eligibility", weight: 20 },
  { label: "Call handling & tone", weight: 15 },
];

const money = (n: number) => `$${n.toFixed(2)}`;

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="gap-0 p-0 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-display text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-border/70 px-4 py-3">{children}</div>}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-border/70 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function AudioBar() {
  const [playing, setPlaying] = useState(false);
  return (
    <Card className="flex flex-row items-center gap-3 p-3 shadow-card">
      <RotateCcw className="size-4 text-muted-foreground" />
      <Button
        size="icon"
        className="size-9 rounded-full"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Pause recording" : "Play recording"}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      <RotateCw className="size-4 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div className="h-full w-0 rounded-full bg-brand" />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>00:00</span>
          <span>—</span>
        </div>
      </div>
      <Volume2 className="size-4 text-muted-foreground" />
      <Download className="size-4 text-muted-foreground" />
    </Card>
  );
}

export function CallDetailSheet({
  call,
  onClose,
  reviewers,
}: {
  call: CallDetail | null;
  onClose: () => void;
  reviewers: string[];
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [disposition, setDisposition] = useState<string | null>(null);
  const [flag, setFlag] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [reviewer, setReviewer] = useState<string>("");

  if (!call) return null;
  const scored = call.outcome !== "Pending";

  return (
    <Sheet open={!!call} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="space-y-0 border-b border-border/70 px-4 pt-4 pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand/12 text-brand">
              <Phone className="size-4" />
            </span>
            <SheetTitle className="text-lg">{call.phone}</SheetTitle>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Play className="size-3.5" /> Start Audit
              </Button>
              <Button size="sm" className="gap-1.5">
                <Check className="size-3.5" /> Complete Audit
              </Button>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <FastForward className="size-3.5" /> Skipped
              </span>
            </div>
          </div>
          <SheetDescription className="pt-1 pb-3">{call.timestamp}</SheetDescription>
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? "border-brand text-brand"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="space-y-3 px-4 py-4">
          {tab === "Overview" && (
            <>
              <Card className="gap-2 p-4 shadow-card">
                <p className="font-display text-sm font-semibold text-foreground">Call Summary</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {call.summary ? buildSummary(call) : "No summary available for this call."}
                </p>
              </Card>

              <AudioBar duration={call.duration} />

              <div className="grid gap-3 sm:grid-cols-2">
                <Card
                  className={`flex-row items-center gap-3 p-4 shadow-card ${
                    scored
                      ? good
                        ? "border-success/30 bg-success/8"
                        : "border-destructive/30 bg-destructive/8"
                      : ""
                  }`}
                >
                  <span
                    className={`flex size-9 items-center justify-center rounded-lg ${
                      scored
                        ? good
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <ShieldQuestion className="size-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">QC Status</p>
                    <p
                      className={`font-display text-base font-semibold ${
                        scored ? (good ? "text-success" : "text-destructive") : "text-foreground"
                      }`}
                    >
                      {scored ? (good ? "Good" : "Poor") : "Not Scored"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scored
                        ? good
                          ? "The quality of this call meets our standards."
                          : call.reason || "This call fell below the quality threshold."
                        : "QC scoring is not available for this call yet."}
                    </p>
                  </div>
                  {scored && (
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                        good ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {good ? <Check className="size-4" /> : <Flag className="size-4" />}
                    </span>
                  )}
                </Card>
                <Card className="flex-row items-center gap-3 border-brand/25 bg-brand/6 p-4 shadow-card">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-brand/15 text-brand">
                    <PieChart className="size-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="font-display text-xl font-semibold text-brand">
                      {scored ? call.score : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Overall audit score</p>
                  </div>
                  <ScoreRing value={scored ? call.score : 0} />
                </Card>
              </div>


              <Card className="gap-3 p-3 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: "green", cls: "bg-success/15 text-success border-success/30" },
                    { key: "amber", cls: "bg-warning/20 text-brand-tan border-warning/40" },
                    { key: "red", cls: "bg-destructive/15 text-destructive border-destructive/30" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFlag(flag === f.key ? null : f.key)}
                      className={`flex size-8 items-center justify-center rounded-lg border ${f.cls} ${
                        flag === f.key ? "ring-2 ring-brand/40" : ""
                      }`}
                      aria-label={`${f.key} flag`}
                    >
                      <Flag className="size-4" />
                    </button>
                  ))}
                  {["Valid", "Invalid", "Detailed", "Escalate"].map((d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant={disposition === d ? "default" : "outline"}
                      onClick={() => setDisposition(disposition === d ? null : d)}
                    >
                      {d}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      setDisposition(null);
                      setFlag(null);
                    }}
                  >
                    Clear
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {call.auditedBy && call.auditedBy !== "-"
                    ? `Audited by ${call.auditedBy}`
                    : "Not audited yet"}
                </p>
              </Card>

              <Card className="gap-0 p-4 shadow-card">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand/12 text-brand">
                    <MessageSquare className="size-4" />
                  </span>
                  <p className="font-display text-sm font-semibold text-foreground">Comments</p>
                  <Button variant="outline" size="sm" className="ml-auto gap-1.5">
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                </div>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={call.comment || "Add a comment…"}
                  className="mt-3 min-h-16"
                />
                <div className="mt-4 space-y-3 border-t border-dashed border-border/70 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand/12 text-brand">
                      <FileText className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">QA Disposition</p>
                      <p className="text-xs text-muted-foreground">{disposition ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand/12 text-brand">
                      <Sparkles className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Remarks</p>
                      <p className="text-xs text-muted-foreground">{call.reason || "—"}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Section title="Call info">
                <Row label="Call ID" value={call.rtbBidId} />
                <Row label="Call Date" value={call.timestamp} />
                <Row label="Inbound Phone" value={call.phone} />
                <Row label="Duration" value={call.duration} />
                <Row label="Publisher" value={call.publisher} />
                <Row label="Campaign" value={call.campaign} />
                <Row label="Buyer" value={call.buyer} />
                <Row label="Target" value={call.target} />
                <Row label="Revenue" value={money(call.revenue)} />
                <Row label="Payout" value={money(call.payout)} />
                <Row label="Profit" value={money(call.revenue - call.payout)} />
                <Row label="End Call Source" value={call.endCallSource} />
              </Section>

              <Section title="Processed data">
                <Row label="Conversion" value={call.validSale === "Valid" ? "Yes" : "No"} />
                <Row label="Recording" value="Available" />
                <Row label="Transcription" value={call.transcript ? "Available" : "Missing"} />
                <Row label="Duplicate" value={call.duplicate ? "Yes" : "No"} />
                <Row label="Fake Customer" value={call.fakeCustomer ? "Yes" : "No"} />
                <Row label="QC Critical" value={scored ? call.outcome : "Not Scored"} />
              </Section>

              <Section title="Source data" defaultOpen={false}>
                <pre className="max-h-72 overflow-auto rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
{JSON.stringify(
  {
    id: call.id,
    audited_by_name: call.auditedBy === "-" ? null : call.auditedBy,
    source_id: call.rtbBidId,
    timestamp: call.timestamp,
    inbound_phone: call.phone,
    status: call.callStatus,
    duration: call.duration,
    publisher: call.publisher,
    campaign: call.campaign,
    buyer: call.buyer,
    target: call.target,
    revenue: call.revenue,
    payout: call.payout,
    duplicate: call.duplicate,
    fake_customer: call.fakeCustomer,
  },
  null,
  2,
)}
                </pre>
              </Section>
            </>
          )}

          {tab === "Scoring" && (
            <>
              <Card className="gap-3 p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="font-display text-sm font-semibold text-foreground">
                    Scorecard breakdown
                  </p>
                  <Badge variant="outline" className="border-brand/25 bg-brand/10 text-brand">
                    {scored ? call.score : 0}%
                  </Badge>
                </div>
                <div className="space-y-3">
                  {scorecardCriteria.map((c, i) => {
                    const value = Math.min(100, Math.max(30, call.score - i * 4 + (i % 2 ? 6 : -3)));
                    return (
                      <div key={c.label}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-foreground">{c.label}</span>
                          <span className="text-muted-foreground">
                            {value}% · weight {c.weight}%
                          </span>
                        </div>
                        <Progress value={value} />
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card className="gap-2 p-4 shadow-card">
                <p className="text-sm font-semibold text-foreground">Assign reviewer</p>
                <Select value={reviewer || call.reviewer} onValueChange={setReviewer}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reviewers.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" className="flex-1">
                    Fail
                  </Button>
                  <Button className="flex-1">Pass</Button>
                </div>
              </Card>
            </>
          )}

          {tab === "Transcript" && (
            <Card className="gap-4 p-4 shadow-card">
              {call.transcript ? (
                <div className="space-y-3">
                  {buildTranscript(call).map((m, i) => {
                    const agent = m.who === "Agent";
                    return (
                      <div
                        key={i}
                        className={`flex ${agent ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            agent
                              ? "rounded-br-sm bg-brand/12 text-foreground"
                              : "rounded-bl-sm bg-muted text-foreground"
                          }`}
                        >
                          <p
                            className={`mb-0.5 text-xs font-semibold ${
                              agent ? "text-success" : "text-brand"
                            }`}
                          >
                            {m.who}
                          </p>
                          <p className="leading-relaxed">
                            {m.text}{" "}
                            <span className="align-baseline text-[10px] text-muted-foreground">
                              {m.at}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No transcript available for this call.
                </p>
              )}
            </Card>
          )}

        </div>
      </SheetContent>
    </Sheet>
  );
}
