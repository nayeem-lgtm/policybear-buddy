import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ShieldAlert, UserX, Clock } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Timeline } from "@/components/crm/Timeline";
import { useFilters, unique } from "@/lib/use-filters";
import { employees } from "@/lib/mock-data";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_shell/complaints")({
  head: () => ({
    meta: [
      { title: "Complaints & Tips — Policy Bear CRM" },
      {
        name: "description",
        content: "Anonymous tip and complaint inbox with severity, category and investigation status.",
      },
      { property: "og:title", content: "Complaints & Tips — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Anonymous tip and complaint inbox with severity, category and investigation status.",
      },
    ],
  }),
  component: ComplaintsPage,
});

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length] as T;
}

interface Complaint {
  id: string;
  subject: string;
  category: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  submittedBy: string;
  hrOwner: string;
  status: "New" | "Investigating" | "Resolved" | "Closed";
  reportedAt: string;
  anonymous: boolean;
  summary: string;
}

const subjects = [
  "Unprofessional conduct on call",
  "Scheduling favoritism concern",
  "Safety issue in break room",
  "Retaliation after policy question",
  "Misrepresentation of plan benefits",
  "Harassment allegation",
  "Time card discrepancy",
];
const categories = ["Conduct", "Compliance", "Workplace Safety", "Harassment", "Payroll", "Ethics"];
const hrOwners = ["Nadia Rahimi", "Talia Bennett", "Farah Sutton"];

const complaints: Complaint[] = Array.from({ length: 14 }, (_, i) => ({
  id: `CMP-${500 + i}`,
  subject: pick(subjects, i),
  category: pick(categories, i),
  severity: pick(["Low", "Medium", "High", "Critical"] as const, i),
  submittedBy: i % 3 === 0 ? "Anonymous" : pick(employees, i % 12).name,
  hrOwner: pick(hrOwners, i),
  status: pick(["New", "Investigating", "Resolved", "Closed"] as const, i),
  reportedAt: `2026-08-0${(i % 6) + 1}`,
  anonymous: i % 3 === 0,
  summary:
    "Submitted through the internal tip line. HR has acknowledged receipt and is reviewing supporting details before scheduling interviews.",
}));

function ComplaintsPage() {
  const [selected, setSelected] = useState<Complaint | null>(null);

  const severityOptions = useMemo(() => unique(complaints, (c) => c.severity), []);
  const categoryOptions = useMemo(() => unique(complaints, (c) => c.category), []);
  const statusOptions = useMemo(() => unique(complaints, (c) => c.status), []);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(complaints, {
    searchFields: (c) => [c.subject, c.category, c.hrOwner],
    filters: {
      severity: (c) => c.severity,
      category: (c) => c.category,
      status: (c) => c.status,
    },
  });

  const openCount = complaints.filter((c) => c.status === "New" || c.status === "Investigating").length;
  const criticalCount = complaints.filter((c) => c.severity === "Critical").length;
  const anonymousCount = complaints.filter((c) => c.anonymous).length;

  const columns: Column<Complaint>[] = [
    { key: "id", header: "ID", cell: (c) => <span className="font-mono text-xs">{c.id}</span> },
    { key: "subject", header: "Subject", cell: (c) => c.subject },
    { key: "category", header: "Category", cell: (c) => <Badge variant="secondary">{c.category}</Badge> },
    {
      key: "severity",
      header: "Severity",
      cell: (c) => (
        <StatusBadge status={c.severity} tone={c.severity === "Critical" || c.severity === "High" ? "danger" : c.severity === "Medium" ? "warning" : "muted"} />
      ),
    },
    { key: "submittedBy", header: "Submitted By", cell: (c) => c.submittedBy },
    { key: "hrOwner", header: "HR Owner", cell: (c) => c.hrOwner },
    { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
    { key: "reportedAt", header: "Reported", cell: (c) => c.reportedAt },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Complaints & Tips"
        description="Anonymous tip line and formal complaint inbox with severity triage and investigation ownership."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open Cases" value={openCount} tone="warning" icon={<AlertTriangle className="size-4" />} />
        <StatCard label="Critical/High Severity" value={complaints.filter((c) => c.severity === "Critical" || c.severity === "High").length} tone="danger" icon={<ShieldAlert className="size-4" />} />
        <StatCard label="Anonymous Reports" value={anonymousCount} icon={<UserX className="size-4" />} />
        <StatCard label="Avg. Time to Review" value="1.8 days" icon={<Clock className="size-4" />} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by subject, category or owner…"
        filters={[
          { key: "severity", label: "Severity", options: severityOptions },
          { key: "category", label: "Category", options: categoryOptions },
          { key: "status", label: "Status", options: statusOptions },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => setSelected(row)}
        footer={<span>{filtered.length} of {complaints.length} cases</span>}
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.subject}</SheetTitle>
                <SheetDescription>
                  {selected.id} · {selected.category} · Reported {selected.reportedAt}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selected.status} />
                  <StatusBadge status={selected.severity} tone={selected.severity === "Critical" || selected.severity === "High" ? "danger" : "warning"} />
                  <Badge variant="secondary">Owner: {selected.hrOwner}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{selected.summary}</p>
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Investigation timeline</p>
                  <Timeline
                    items={[
                      { time: selected.reportedAt, event: "Report received", tone: "brand", detail: selected.anonymous ? "Submitted anonymously" : `Submitted by ${selected.submittedBy}` },
                      { time: "+1 day", event: "Assigned to HR owner", detail: selected.hrOwner, tone: "info" },
                      { time: "+3 days", event: "Interviews scheduled", tone: "warning" },
                      { time: "Ongoing", event: `Status: ${selected.status}`, tone: selected.status === "Resolved" ? "success" : "muted" },
                    ]}
                  />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
