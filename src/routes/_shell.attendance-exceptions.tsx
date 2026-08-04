import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertOctagon, Check, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { employees } from "@/lib/mock-data";
import { unique, useFilters } from "@/lib/use-filters";

export const Route = createFileRoute("/_shell/attendance-exceptions")({
  head: () => ({
    meta: [
      { title: "Attendance Exceptions — Policy Bear CRM" },
      {
        name: "description",
        content: "Queue of late, early-out, missed-punch and break-overrun exceptions awaiting review.",
      },
      { property: "og:title", content: "Attendance Exceptions — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Approve or reject attendance exceptions with evidence and bulk actions.",
      },
    ],
  }),
  component: AttendanceExceptionsPage,
});

type ExceptionType = "Late" | "Early Out" | "Missed Punch" | "Break Overrun";
type ExceptionStatus = "Pending" | "Approved" | "Rejected";

interface ExceptionRow {
  id: string;
  employee: string;
  team: string;
  type: ExceptionType;
  date: string;
  detail: string;
  reason: string;
  evidence: string;
  status: ExceptionStatus;
}

const types: ExceptionType[] = ["Late", "Early Out", "Missed Punch", "Break Overrun"];
const reasons = [
  "Traffic delay",
  "Internet outage",
  "Medical appointment",
  "CallTools sync issue",
  "Overslept",
  "Extended lunch — sick child",
];

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length] as T;
}

function seedRows(): ExceptionRow[] {
  return Array.from({ length: 22 }, (_, i) => {
    const emp = pick(employees, i * 3 + 1);
    const type = pick(types, i);
    return {
      id: `EXC-${4100 + i}`,
      employee: emp.name,
      team: emp.team,
      type,
      date: `2026-08-${(i % 20) + 1}`,
      detail:
        type === "Late"
          ? `Clocked in at 07:${10 + (i % 20)}`
          : type === "Early Out"
            ? `Clocked out at 15:${20 + (i % 30)}`
            : type === "Missed Punch"
              ? "No sign-out recorded"
              : `Break exceeded by ${4 + (i % 12)} minutes`,
      reason: pick(reasons, i),
      evidence: i % 3 === 0 ? "Supervisor note attached" : "No evidence attached",
      status: pick(["Pending", "Approved", "Rejected"] as ExceptionStatus[], i % 5 === 0 ? 1 : i % 7 === 0 ? 2 : 0),
    };
  });
}

function toneForType(type: ExceptionType) {
  switch (type) {
    case "Late":
      return "warning" as const;
    case "Early Out":
      return "info" as const;
    case "Missed Punch":
      return "danger" as const;
    case "Break Overrun":
      return "danger" as const;
  }
}

function AttendanceExceptionsPage() {
  const [rows, setRows] = useState<ExceptionRow[]>(seedRows);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const teams = useMemo(() => unique(rows, (r) => r.team), [rows]);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(rows, {
    searchFields: (r) => [r.employee, r.detail, r.reason],
    filters: {
      type: (r) => r.type,
      status: (r) => r.status,
      team: (r) => r.team,
    },
  });

  const pendingCount = rows.filter((r) => r.status === "Pending").length;
  const approvedCount = rows.filter((r) => r.status === "Approved").length;
  const overrunCount = rows.filter((r) => r.type === "Break Overrun").length;

  function setStatus(id: string, status: ExceptionStatus) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function bulkSet(status: ExceptionStatus) {
    if (selected.size === 0) return;
    setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, status } : r)));
    toast.success(`${selected.size} exception(s) ${status.toLowerCase()}`);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Attendance Exceptions"
        description="Review late arrivals, early departures, missed punches and break overruns."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending review" value={pendingCount} tone="warning" icon={<AlertOctagon className="size-4" />} />
        <StatCard label="Approved" value={approvedCount} tone="success" />
        <StatCard label="Break overruns" value={overrunCount} tone="danger" />
        <StatCard label="Total exceptions" value={rows.length} hint="This pay period" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search employee or reason…"
        filters={[
          { key: "type", label: "Type", options: types },
          { key: "status", label: "Status", options: ["Pending", "Approved", "Rejected"] },
          { key: "team", label: "Team", options: teams },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
        trailing={
          selected.size > 0 ? (
            <>
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <Button size="sm" onClick={() => bulkSet("Approved")}>
                <Check className="size-4" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => bulkSet("Rejected")}>
                <X className="size-4" /> Reject
              </Button>
            </>
          ) : undefined
        }
      />

      <DataTable
        columns={[
          {
            key: "select",
            header: "",
            cell: (r) => (
              <Checkbox
                checked={selected.has(r.id)}
                onCheckedChange={() => toggle(r.id)}
                aria-label={`Select ${r.employee}`}
              />
            ),
          },
          {
            key: "employee",
            header: "Employee",
            cell: (r) => (
              <div>
                <p className="font-medium text-foreground">{r.employee}</p>
                <p className="text-xs text-muted-foreground">{r.team}</p>
              </div>
            ),
          },
          { key: "type", header: "Type", cell: (r) => <StatusBadge status={r.type} tone={toneForType(r.type)} /> },
          { key: "date", header: "Date", cell: (r) => r.date },
          { key: "detail", header: "Detail", cell: (r) => <span className="text-muted-foreground">{r.detail}</span> },
          { key: "reason", header: "Reason", cell: (r) => r.reason },
          {
            key: "evidence",
            header: "Evidence",
            cell: (r) => (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="size-3.5" /> {r.evidence}
              </span>
            ),
          },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            cell: (r) =>
              r.status === "Pending" ? (
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "Approved")}>
                    <Check className="size-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "Rejected")}>
                    <X className="size-3.5" /> Reject
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Resolved</span>
              ),
          },
        ]}
        rows={filtered}
        footer={
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={(v) =>
                setSelected(v ? new Set(filtered.map((r) => r.id)) : new Set())
              }
              aria-label="Select all visible"
            />
            <span>Select all {filtered.length} visible rows</span>
          </div>
        }
      />
    </div>
  );
}
