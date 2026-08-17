import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, History, LogIn, Sigma } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable } from "@/components/crm/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AUDIT_CATEGORIES, useAuditTrail, type AuditEvent } from "@/lib/audit-log";

export const Route = createFileRoute("/_shell/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Logs — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Searchable audit trail of sign-in events plus finance, revenue, call and attendance calculations and exports.",
      },
      { property: "og:title", content: "Audit Logs — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Searchable audit trail of sign-in events plus finance, revenue, call and attendance calculations and exports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditLogsPage,
});

const categoryTone: Record<string, "default" | "secondary" | "outline"> = {
  Auth: "default",
  Finance: "secondary",
  Revenue: "secondary",
  Payroll: "secondary",
  Expense: "secondary",
  Calls: "outline",
  Attendance: "outline",
  System: "outline",
};

function csvDownload(rows: AuditEvent[]) {
  const header = ["Timestamp", "Actor", "Email", "Category", "Action", "Entity", "Record", "Reason", "Detail"];
  const body = [
    header,
    ...rows.map((r) => [
      r.timestamp,
      r.actor,
      r.actorEmail ?? "",
      r.category,
      r.action,
      r.recordType,
      r.recordId,
      r.reason,
      JSON.stringify(r.detail),
    ]),
  ]
    .map((r) =>
      r
        .map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c)))
        .join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function AuditLogsPage() {
  const trail = useAuditTrail();
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trail.filter((r) => {
      if (
        q &&
        ![r.actor, r.actorEmail ?? "", r.action, r.recordId, r.recordType, JSON.stringify(r.detail)].some((f) =>
          f.toLowerCase().includes(q),
        )
      )
        return false;
      if (values["category"] && r.category !== values["category"]) return false;
      if (values["actor"] && r.actor !== values["actor"]) return false;
      if (values["action"] && r.action !== values["action"]) return false;
      return true;
    });
  }, [trail, search, values]);

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const todayCount = trail.filter((r) => r.timestamp.startsWith(todayPrefix)).length;
  const authCount = trail.filter((r) => r.category === "Auth").length;
  const calcCount = trail.filter((r) =>
    ["Finance", "Revenue", "Payroll", "Expense", "Calls", "Attendance"].includes(r.category),
  ).length;

  const actorOptions = Array.from(new Set(trail.map((r) => r.actor))).sort();
  const actionOptions = Array.from(new Set(trail.map((r) => r.action))).sort();
  const categoryOptions = AUDIT_CATEGORIES.filter((c) => trail.some((r) => r.category === c));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings · Access control"
        title="Audit Logs"
        description="Sign-in activity plus every finance, revenue, call and attendance calculation or export, with actor and timestamp."
        actions={
          <Button variant="outline" className="gap-2" onClick={() => csvDownload(filtered)}>
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total events" value={trail.length} tone="brand" icon={<History className="size-4" />} />
        <StatCard label="Events today" value={todayCount} tone="info" />
        <StatCard label="Sign-in events" value={authCount} tone="default" icon={<LogIn className="size-4" />} />
        <StatCard
          label="Calculations & exports"
          value={calcCount}
          tone="warning"
          icon={<Sigma className="size-4" />}
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by actor, action, record or detail…"
        filters={[
          { key: "category", label: "Category", options: categoryOptions },
          { key: "actor", label: "Actor", options: actorOptions },
          { key: "action", label: "Action", options: actionOptions },
        ]}
        values={values}
        onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
        onReset={() => {
          setValues({});
          setSearch("");
        }}
      />

      <DataTable
        onRowClick={(row) => setSelected(row)}
        columns={[
          { key: "timestamp", header: "Timestamp", cell: (r) => <span className="tabular">{r.timestamp}</span> },
          {
            key: "actor",
            header: "Actor",
            cell: (r) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{r.actor}</p>
                {r.actorEmail && <p className="truncate text-xs text-muted-foreground">{r.actorEmail}</p>}
              </div>
            ),
          },
          {
            key: "category",
            header: "Category",
            cell: (r) => <Badge variant={categoryTone[r.category] ?? "outline"}>{r.category}</Badge>,
          },
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
          {
            key: "source",
            header: "Source",
            cell: (r) => (
              <span className="text-xs text-muted-foreground">{r.source === "live" ? "Recorded" : "Historic"}</span>
            ),
          },
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
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="text-foreground">{selected.category}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Entity</dt>
                    <dd className="text-right text-foreground">
                      {selected.recordType} · {selected.recordId}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Account</dt>
                    <dd className="text-foreground">{selected.actorEmail ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Origin</dt>
                    <dd className="font-mono text-foreground">{selected.ip}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Reason</dt>
                    <dd className="text-right text-foreground">{selected.reason}</dd>
                  </div>
                </dl>
                <div>
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Recorded values
                  </p>
                  <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
{JSON.stringify(selected.detail ?? {}, null, 2)}
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
