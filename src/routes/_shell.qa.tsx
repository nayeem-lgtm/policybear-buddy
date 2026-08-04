import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Button } from "@/components/ui/button";
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
import { useFilters, unique } from "@/lib/use-filters";
import { ClipboardCheck, ShieldAlert, Gauge, Clock, Check, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

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

function QAPage() {
  const [selected, setSelected] = useState<QAReview | null>(null);
  const [reviewer, setReviewer] = useState<string>("");

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(qaReviews, {
    searchFields: (r) => [r.agent, r.customer, r.callId, r.publisher],
    filters: {
      outcome: (r) => r.outcome,
      reviewer: (r) => r.reviewer,
      publisher: (r) => r.publisher,
    },
  });

  const stats = useMemo(() => {
    const pending = qaReviews.filter((r) => r.outcome === "Pending").length;
    const avgScore = Math.round(qaReviews.reduce((s, r) => s + r.score, 0) / qaReviews.length);
    const invalid = qaReviews.filter((r) => r.outcome === "Invalid").length;
    const disputed = qaReviews.filter((r) => r.outcome === "Disputed").length;
    return { pending, avgScore, invalid, disputed };
  }, []);

  const columns: Column<QAReview>[] = [
    { key: "id", header: "Review", cell: (r) => <span className="font-medium text-foreground">{r.id}</span> },
    { key: "callId", header: "Call", cell: (r) => r.callId },
    { key: "agent", header: "Agent", cell: (r) => r.agent },
    { key: "customer", header: "Customer", cell: (r) => r.customer },
    { key: "publisher", header: "Publisher", cell: (r) => <span className="text-muted-foreground">{r.publisher}</span> },
    { key: "reviewer", header: "Reviewer", cell: (r) => r.reviewer },
    {
      key: "score",
      header: "Score",
      cell: (r) => (
        <span className={r.score >= 80 ? "font-medium text-success" : r.score >= 65 ? "font-medium text-brand-tan" : "font-medium text-destructive"}>
          {r.score}
        </span>
      ),
      align: "right",
    },
    { key: "deadline", header: "Deadline", cell: (r) => r.deadline },
    { key: "outcome", header: "Outcome", cell: (r) => <StatusBadge status={r.outcome} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quality Control"
        title="QA Review Queue"
        description="Score submitted calls against the compliance scorecard and assign reviewers."
        actions={
          <Link to="/qa/import">
            <Button size="sm" variant="outline">Smart QC Import</Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending review" value={stats.pending} tone="warning" icon={<Clock className="size-4" />} />
        <StatCard label="Average score" value={`${stats.avgScore}`} tone="brand" icon={<Gauge className="size-4" />} />
        <StatCard label="Invalid calls" value={stats.invalid} tone="danger" icon={<ShieldAlert className="size-4" />} />
        <StatCard label="Disputed" value={stats.disputed} icon={<ClipboardCheck className="size-4" />} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search agent, customer, call ID…"
        filters={[
          { key: "outcome", label: "Outcome", options: unique(qaReviews, (r) => r.outcome) },
          { key: "reviewer", label: "Reviewer", options: unique(qaReviews, (r) => r.reviewer) },
          { key: "publisher", label: "Publisher", options: unique(qaReviews, (r) => r.publisher) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} onRowClick={setSelected} footer={`${filtered.length} of ${qaReviews.length} reviews`} />

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
