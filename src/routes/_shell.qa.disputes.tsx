import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Button } from "@/components/ui/button";
import { qaReviews, employees } from "@/lib/mock-data";
import { useFilters, unique } from "@/lib/use-filters";
import { Gavel, ScaleIcon, ThumbsDown, ThumbsUp, Clock } from "lucide-react";

export const Route = createFileRoute("/_shell/qa/disputes")({
  head: () => ({
    meta: [
      { title: "QA Disputes — Policy Bear CRM" },
      { name: "description", content: "Agent disputes on QA scores with original vs proposed scores and reviewer decisions." },
      { property: "og:title", content: "QA Disputes — Policy Bear CRM" },
      { property: "og:description", content: "Agent disputes on QA scores with original vs proposed scores and reviewer decisions." },
    ],
  }),
  component: QADisputesPage,
});

interface Dispute {
  id: string;
  callId: string;
  agent: string;
  reviewer: string;
  originalScore: number;
  proposedScore: number;
  reason: string;
  filedOn: string;
  status: "Awaiting Review" | "Upheld" | "Overturned" | "Partial Adjustment";
}

const disputeReasons = [
  "Consent was captured, timestamp missed by reviewer",
  "Disclosure was read but not logged correctly",
  "Scorecard criteria misapplied for plan type",
  "Customer eligibility was in fact verified",
  "Call recording cut off before full disclosure",
];

const disputes: Dispute[] = qaReviews
  .filter((r) => r.outcome === "Disputed" || r.score < 75)
  .slice(0, 16)
  .map((r, i) => ({
    id: `DSP-${1800 + i}`,
    callId: r.callId,
    agent: r.agent,
    reviewer: r.reviewer,
    originalScore: r.score,
    proposedScore: Math.min(100, r.score + 12 + (i % 3) * 4),
    reason: disputeReasons[i % disputeReasons.length]!,
    filedOn: `2026-08-0${(i % 6) + 1}`,
    status: (["Awaiting Review", "Upheld", "Overturned", "Partial Adjustment"] as const)[i % 4]!,
  }));

function QADisputesPage() {
  const [selected, setSelected] = useState<Dispute | null>(null);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(disputes, {
    searchFields: (d) => [d.agent, d.callId, d.reviewer],
    filters: {
      status: (d) => d.status,
      reviewer: (d) => d.reviewer,
    },
  });

  const stats = useMemo(() => {
    const awaiting = disputes.filter((d) => d.status === "Awaiting Review").length;
    const overturned = disputes.filter((d) => d.status === "Overturned").length;
    const upheld = disputes.filter((d) => d.status === "Upheld").length;
    const avgDelta = Math.round(
      disputes.reduce((s, d) => s + (d.proposedScore - d.originalScore), 0) / disputes.length,
    );
    return { awaiting, overturned, upheld, avgDelta };
  }, []);

  const columns: Column<Dispute>[] = [
    { key: "id", header: "Dispute", cell: (d) => <span className="font-medium text-foreground">{d.id}</span> },
    { key: "callId", header: "Call", cell: (d) => d.callId },
    { key: "agent", header: "Agent", cell: (d) => d.agent },
    { key: "reviewer", header: "Reviewer", cell: (d) => d.reviewer },
    { key: "originalScore", header: "Original", cell: (d) => <span className="tabular text-muted-foreground">{d.originalScore}</span>, align: "right" },
    { key: "proposedScore", header: "Proposed", cell: (d) => <span className="tabular font-medium text-foreground">{d.proposedScore}</span>, align: "right" },
    { key: "filedOn", header: "Filed", cell: (d) => d.filedOn },
    { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} tone={d.status === "Awaiting Review" ? "warning" : d.status === "Overturned" ? "success" : d.status === "Upheld" ? "danger" : "info"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quality Control"
        title="QA Disputes"
        description="Review agent-filed disputes against original QA scores and issue a final decision."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting review" value={stats.awaiting} tone="warning" icon={<Clock className="size-4" />} />
        <StatCard label="Overturned" value={stats.overturned} tone="success" icon={<ThumbsUp className="size-4" />} />
        <StatCard label="Upheld" value={stats.upheld} tone="danger" icon={<ThumbsDown className="size-4" />} />
        <StatCard label="Avg. proposed delta" value={`+${stats.avgDelta}`} tone="brand" icon={<ScaleIcon className="size-4" />} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search agent, call ID, reviewer…"
        filters={[
          { key: "status", label: "Status", options: unique(disputes, (d) => d.status) },
          { key: "reviewer", label: "Reviewer", options: unique(disputes, (d) => d.reviewer) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={setSelected}
        footer={`${filtered.length} of ${disputes.length} disputes`}
      />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 sm:items-center" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Gavel className="size-4 text-brand" />
              <p className="text-sm font-semibold text-foreground">{selected.id} — reviewer decision</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{selected.agent} disputed {selected.callId} scored by {selected.reviewer}</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Original score</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{selected.originalScore}</p>
              </div>
              <div className="rounded-md border border-brand/25 bg-brand/5 p-3 text-center">
                <p className="text-xs text-brand">Proposed score</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{selected.proposedScore}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Dispute reason</p>
              <p className="mt-1 text-sm text-foreground">{selected.reason}</p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <StatusBadge status={selected.status} tone={selected.status === "Awaiting Review" ? "warning" : selected.status === "Overturned" ? "success" : selected.status === "Upheld" ? "danger" : "info"} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button>
                <Button variant="outline" size="sm" className="gap-1.5"><ThumbsDown className="size-3.5" /> Uphold</Button>
                <Button size="sm" className="gap-1.5"><ThumbsUp className="size-3.5" /> Overturn</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
