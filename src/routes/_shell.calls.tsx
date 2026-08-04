import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PhoneCall, Clock, PlayCircle, DollarSign } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { calls, type CallRecord } from "@/lib/mock-data";
import { useFilters, unique } from "@/lib/use-filters";

export const Route = createFileRoute("/_shell/calls")({
  head: () => ({
    meta: [
      { title: "Call Log — Policy Bear CRM" },
      {
        name: "description",
        content: "Every inbound and outbound call with disposition, recording and billing status.",
      },
      { property: "og:title", content: "Call Log — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Every inbound and outbound call with disposition, recording and billing status.",
      },
    ],
  }),
  component: CallsPage,
});

const dateRanges = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days"];

function CallsPage() {
  const [selected, setSelected] = useState<CallRecord | null>(null);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(calls, {
    searchFields: (r) => [r.customer, r.phone, r.callId, r.agent],
    filters: {
      disposition: (r) => r.disposition,
      publisher: (r) => r.publisher,
      agent: (r) => r.agent,
      dateRange: () => "Today",
    },
  });

  const stats = useMemo(() => {
    const total = calls.length;
    const paid = calls.filter((c) => c.paid).length;
    const avgSeconds = Math.round(calls.reduce((a, c) => a + c.billableSeconds, 0) / calls.length);
    const totalCost = calls.reduce((a, c) => a + Number(c.cost.replace("$", "")), 0);
    return { total, paid, avgSeconds, totalCost };
  }, []);

  const columns: Column<CallRecord>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.customer}</p>
          <p className="text-xs text-muted-foreground">{r.callId}</p>
        </div>
      ),
    },
    { key: "agent", header: "Agent", cell: (r) => r.agent },
    { key: "publisher", header: "Publisher", cell: (r) => r.publisher },
    { key: "direction", header: "Direction", cell: (r) => r.direction },
    { key: "startedAt", header: "Started", cell: (r) => r.startedAt },
    { key: "duration", header: "Duration", cell: (r) => r.duration },
    {
      key: "recording",
      header: "Recording",
      align: "center",
      cell: (r) =>
        r.recording ? (
          <PlayCircle className="mx-auto size-4 text-brand" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "disposition",
      header: "Disposition",
      cell: (r) => <StatusBadge status={r.disposition} />,
    },
    { key: "cost", header: "Cost", cell: (r) => r.cost, align: "right" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Call Log"
        description="Inbound and outbound call activity across every agent and publisher."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Calls" value={stats.total} icon={<PhoneCall className="size-4" />} tone="brand" />
        <StatCard label="Paid Calls" value={stats.paid} icon={<DollarSign className="size-4" />} tone="success" />
        <StatCard label="Avg Duration" value={`${Math.floor(stats.avgSeconds / 60)}m ${stats.avgSeconds % 60}s`} icon={<Clock className="size-4" />} tone="info" />
        <StatCard label="Total Cost" value={`$${stats.totalCost.toFixed(0)}`} icon={<DollarSign className="size-4" />} tone="warning" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search calls by customer, phone or call ID…"
        filters={[
          { key: "disposition", label: "Disposition", options: unique(calls, (r) => r.disposition) },
          { key: "publisher", label: "Publisher", options: unique(calls, (r) => r.publisher) },
          { key: "agent", label: "Agent", options: unique(calls, (r) => r.agent) },
          { key: "dateRange", label: "Date Range", options: dateRanges },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} onRowClick={setSelected} footer={`${filtered.length} of ${calls.length} calls`} />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.callId}</DialogTitle>
                <DialogDescription>
                  {selected.customer} · {selected.startedAt}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap gap-1.5">
                <StatusBadge status={selected.disposition} />
                <StatusBadge status={selected.qaStatus} />
                <Badge variant="secondary">{selected.direction}</Badge>
                {selected.matched ? <Badge variant="secondary">Matched</Badge> : <Badge variant="outline">Unmatched</Badge>}
              </div>

              <div className="rounded-md border border-border bg-surface/50 p-3">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <PlayCircle className="size-3.5" /> Recording
                </p>
                {selected.recording ? (
                  <div className="flex items-center gap-3">
                    <PlayCircle className="size-8 text-brand" />
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div className="h-2 w-1/3 rounded-full bg-brand" />
                    </div>
                    <span className="text-xs text-muted-foreground">{selected.duration}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recording available for this call.</p>
                )}
              </div>

              <Separator />

              <div className="space-y-1.5 text-sm">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Transcript</p>
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-border p-3 text-sm">
                  <p><span className="font-medium text-foreground">Agent:</span> Thanks for calling Policy Bear, this is {selected.agent}, how can I help you today?</p>
                  <p><span className="font-medium text-foreground">Customer:</span> Hi, I got a call about health plan options.</p>
                  <p><span className="font-medium text-foreground">Agent:</span> Absolutely, let me pull up your info and see what you qualify for.</p>
                  <p><span className="font-medium text-foreground">Customer:</span> Sounds good, I'm mainly looking for something affordable.</p>
                  <p className="text-xs text-muted-foreground">— call disposition recorded as "{selected.disposition}" —</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-border p-2">
                  <p className="text-xs text-muted-foreground">Publisher / Campaign</p>
                  <p className="font-medium text-foreground">{selected.publisher}</p>
                  <p className="text-xs text-muted-foreground">{selected.campaign}</p>
                </div>
                <div className="rounded-md border border-border p-2">
                  <p className="text-xs text-muted-foreground">Billing</p>
                  <p className="font-medium text-foreground">{selected.cost}</p>
                  <p className="text-xs text-muted-foreground">{selected.billableSeconds}s billable · {selected.paid ? "Paid" : "Unpaid"}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
