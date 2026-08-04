import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertOctagon, Plus } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable } from "@/components/crm/DataTable";
import { Timeline } from "@/components/crm/Timeline";
import { useFilters, unique } from "@/lib/use-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { incidents } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/incidents")({
  head: () => ({
    meta: [
      { title: "Incidents — Policy Bear CRM" },
      {
        name: "description",
        content: "Incident log with severity, impacted module, owner, status and timeline detail.",
      },
      { property: "og:title", content: "Incidents — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Incident log with severity, impacted module, owner, status and timeline detail.",
      },
    ],
  }),
  component: IncidentsPage,
});

type Incident = (typeof incidents)[number];

function buildTimeline(incident: Incident) {
  return [
    { time: incident.reportedAt, event: "Reported", detail: `Filed by ${incident.reportedBy}`, tone: "info" as const },
    { time: incident.reportedAt, event: "Assigned", detail: `Owner: ${incident.assignedTo}`, tone: "brand" as const },
    {
      time: incident.slaDue,
      event: incident.status === "Resolved" || incident.status === "Closed" ? "Resolved" : "SLA due",
      detail: incident.status === "Resolved" || incident.status === "Closed" ? "Root cause documented" : "Awaiting resolution",
      tone: incident.status === "Resolved" || incident.status === "Closed" ? "success" as const : "warning" as const,
    },
  ];
}

function IncidentsPage() {
  const [selected, setSelected] = useState<Incident | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const { search, setSearch, values, setValue, reset, filtered } = useFilters(incidents, {
    searchFields: (r) => [r.title, r.reportedBy, r.assignedTo],
    filters: {
      severity: (r) => r.severity,
      category: (r) => r.category,
      status: (r) => r.status,
    },
  });

  const open = incidents.filter((i) => i.status === "Open" || i.status === "Investigating");
  const critical = incidents.filter((i) => i.severity === "Critical");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control"
        title="Incidents"
        description="Track incidents affecting the floor, their owners, severity and resolution status."
        actions={
          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                Report incident
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report an incident</DialogTitle>
                <DialogDescription>Log a new incident for the operations team to triage.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input placeholder="Brief summary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Severity</Label>
                    <Select defaultValue="Medium">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select defaultValue="Technical">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="Compliance">Compliance</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Vendor">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea placeholder="What happened, impacted systems, current status…" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setReportOpen(false)}>Submit incident</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total incidents" value={incidents.length} tone="brand" icon={<AlertOctagon className="size-4" />} />
        <StatCard label="Open / investigating" value={open.length} tone="warning" />
        <StatCard label="Critical severity" value={critical.length} tone="danger" />
        <StatCard label="Resolved" value={incidents.filter((i) => i.status === "Resolved" || i.status === "Closed").length} tone="success" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search incidents…"
        filters={[
          { key: "severity", label: "Severity", options: unique(incidents, (r) => r.severity) },
          { key: "category", label: "Module", options: unique(incidents, (r) => r.category) },
          { key: "status", label: "Status", options: unique(incidents, (r) => r.status) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable
        onRowClick={(row) => setSelected(row)}
        columns={[
          { key: "id", header: "ID", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "title", header: "Title", cell: (r) => <span className="font-medium text-foreground">{r.title}</span> },
          { key: "severity", header: "Severity", cell: (r) => <StatusBadge status={r.severity} /> },
          { key: "category", header: "Module", cell: (r) => r.category },
          { key: "assignedTo", header: "Owner", cell: (r) => r.assignedTo },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { key: "slaDue", header: "SLA due", cell: (r) => r.slaDue },
        ]}
        rows={filtered}
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  {selected.id} · {selected.category} · reported by {selected.reportedBy}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.severity} />
                  <StatusBadge status={selected.status} />
                </div>
                <Timeline items={buildTimeline(selected)} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
