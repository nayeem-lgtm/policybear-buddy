import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable } from "@/components/crm/DataTable";
import { useFilters, unique } from "@/lib/use-filters";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { auditLogs } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Logs — Policy Bear CRM" },
      {
        name: "description",
        content: "System-wide audit trail of actor actions, record changes and IP addresses.",
      },
      { property: "og:title", content: "Audit Logs — Policy Bear CRM" },
      {
        property: "og:description",
        content: "System-wide audit trail of actor actions, record changes and IP addresses.",
      },
    ],
  }),
  component: AuditLogsPage,
});

type AuditRow = (typeof auditLogs)[number];

function fakeDiff(row: AuditRow) {
  return {
    before: { status: "Pending", updatedBy: "system", reason: null },
    after: { status: "Approved", updatedBy: row.actor, reason: row.reason !== "—" ? row.reason : null },
  };
}

function AuditLogsPage() {
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const { search, setSearch, values, setValue, reset, filtered } = useFilters(auditLogs, {
    searchFields: (r) => [r.actor, r.action, r.recordId],
    filters: { actor: (r) => r.actor, action: (r) => r.action },
  });

  const todayCount = auditLogs.filter((r) => r.timestamp.startsWith("2026-08-03")).length;
  const uniqueActors = unique(auditLogs, (r) => r.actor).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Audit Logs"
        description="Every material change made across the CRM, with actor, IP and timestamp."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total events" value={auditLogs.length} tone="brand" icon={<History className="size-4" />} />
        <StatCard label="Events today" value={todayCount} tone="info" />
        <StatCard label="Unique actors" value={uniqueActors} tone="default" />
        <StatCard label="With reason noted" value={auditLogs.filter((r) => r.reason !== "—").length} tone="warning" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by actor, action, or record…"
        filters={[
          { key: "actor", label: "Actor", options: unique(auditLogs, (r) => r.actor) },
          { key: "action", label: "Action", options: unique(auditLogs, (r) => r.action) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable
        onRowClick={(row) => setSelected(row)}
        columns={[
          { key: "timestamp", header: "Timestamp", cell: (r) => r.timestamp },
          { key: "actor", header: "Actor", cell: (r) => <span className="font-medium text-foreground">{r.actor}</span> },
          { key: "action", header: "Action", cell: (r) => r.action },
          {
            key: "recordType",
            header: "Entity",
            cell: (r) => (
              <span className="inline-flex items-center gap-1.5">
                <Badge variant="secondary">{r.recordType}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{r.recordId}</span>
              </span>
            ),
          },
          { key: "ip", header: "IP address", cell: (r) => <span className="font-mono text-xs">{r.ip}</span> },
          { key: "reason", header: "Reason", cell: (r) => r.reason },
        ]}
        rows={filtered}
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.action}</SheetTitle>
                <SheetDescription>
                  {selected.id} · {selected.actor} · {selected.timestamp}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Entity</dt>
                    <dd className="text-foreground">
                      {selected.recordType} · {selected.recordId}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">IP address</dt>
                    <dd className="font-mono text-foreground">{selected.ip}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Reason</dt>
                    <dd className="text-foreground">{selected.reason}</dd>
                  </div>
                </dl>
                <div>
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Change diff
                  </p>
                  <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
{JSON.stringify(fakeDiff(selected), null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
