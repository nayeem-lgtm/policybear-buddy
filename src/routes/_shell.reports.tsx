import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, CalendarClock, Download, FileText, PhoneCall, Users } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { DataTable } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { FilterBar } from "@/components/crm/FilterBar";
import { useFilters, unique } from "@/lib/use-filters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_shell/reports")({
  head: () => ({
    meta: [
      { title: "Report Center — Policy Bear CRM" },
      {
        name: "description",
        content: "Report catalog by category, saved reports, scheduling and run history.",
      },
      { property: "og:title", content: "Report Center — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Report catalog by category, saved reports, scheduling and run history.",
      },
    ],
  }),
  component: ReportCenterPage,
});

interface CatalogReport {
  id: string;
  name: string;
  category: "Sales" | "Operations" | "Quality" | "Finance";
  description: string;
  icon: typeof BarChart3;
}

const catalog: CatalogReport[] = [
  { id: "RPT-1", name: "Daily Sales Summary", category: "Sales", description: "Sales, premium and commission totals by team.", icon: BarChart3 },
  { id: "RPT-2", name: "Call Volume & Cost", category: "Operations", description: "Inbound/outbound volume, cost per call, publisher mix.", icon: PhoneCall },
  { id: "RPT-3", name: "Agent Scorecard", category: "Quality", description: "QA scores, dispositions, and coaching flags per agent.", icon: Users },
  { id: "RPT-4", name: "Attendance Exceptions", category: "Operations", description: "Late sign-ins, extended breaks, missed shifts.", icon: CalendarClock },
  { id: "RPT-5", name: "Payroll & Commission Detail", category: "Finance", description: "Payroll rows and commission adjustments by pay period.", icon: FileText },
  { id: "RPT-6", name: "Chargeback Aging", category: "Finance", description: "Open chargebacks grouped by carrier and age.", icon: BarChart3 },
];

interface SavedReport {
  id: string;
  name: string;
  owner: string;
  schedule: string;
  lastRun: string;
  format: "PDF" | "CSV" | "XLSX";
  status: "Active" | "Paused";
}

const savedReports: SavedReport[] = [
  { id: "SVD-1", name: "Weekly Sales Recap", owner: "Marcus Hale", schedule: "Weekly · Mon 06:00", lastRun: "2026-08-03 06:00", format: "PDF", status: "Active" },
  { id: "SVD-2", name: "Publisher Cost Breakdown", owner: "Nadia Bloom", schedule: "Daily · 07:00", lastRun: "2026-08-04 07:00", format: "CSV", status: "Active" },
  { id: "SVD-3", name: "QA Score Distribution", owner: "Leo Whitaker", schedule: "Monthly · 1st", lastRun: "2026-08-01 09:00", format: "XLSX", status: "Paused" },
  { id: "SVD-4", name: "Attendance Exception Log", owner: "Dana Reyes", schedule: "Weekly · Fri 17:00", lastRun: "2026-07-31 17:00", format: "PDF", status: "Active" },
];

interface RunHistoryRow {
  id: string;
  report: string;
  runAt: string;
  runBy: string;
  duration: string;
  status: "Completed" | "Failed" | "Running";
}

const runHistory: RunHistoryRow[] = Array.from({ length: 10 }, (_, i) => ({
  id: `RUN-${4400 + i}`,
  report: savedReports[i % savedReports.length]!.name,
  runAt: `2026-08-0${(i % 5) + 1} ${8 + (i % 6)}:00`,
  runBy: savedReports[i % savedReports.length]!.owner,
  duration: `${1 + (i % 4)}m ${(i * 9) % 60}s`,
  status: i % 7 === 6 ? "Failed" : i % 5 === 4 ? "Running" : "Completed",
}));

function ReportCenterPage() {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { search, setSearch, values, setValue, reset, filtered } = useFilters(savedReports, {
    searchFields: (r) => [r.name, r.owner],
    filters: { status: (r) => r.status },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control"
        title="Report Center"
        description="Browse the report catalog, manage saved reports, and review run history."
        actions={
          <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <CalendarClock className="mr-1.5 size-4" />
                Schedule report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule / export report</DialogTitle>
                <DialogDescription>
                  Configure recurrence and delivery format for a saved report.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Report</Label>
                  <Select defaultValue={catalog[0]!.id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Recurrence</Label>
                    <Select defaultValue="Weekly">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Format</Label>
                    <Select defaultValue="PDF">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="CSV">CSV</SelectItem>
                        <SelectItem value="XLSX">XLSX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Deliver to</Label>
                  <Input placeholder="ops-reports@policybear.com" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setScheduleOpen(false)}>Save schedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Report catalog</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {catalog.map((r) => (
            <Card key={r.id} className="flex flex-col gap-2 p-4 shadow-card">
              <div className="flex items-center justify-between">
                <r.icon className="size-5 text-brand" />
                <Badge variant="secondary">{r.category}</Badge>
              </div>
              <p className="text-sm font-semibold text-foreground">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.description}</p>
              <Button variant="outline" size="sm" className="mt-1 self-start">
                <Download className="mr-1.5 size-3.5" />
                Run now
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Saved reports</p>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search saved reports…"
          filters={[{ key: "status", label: "Status", options: unique(savedReports, (r) => r.status) }]}
          values={values}
          onChange={setValue}
          onReset={reset}
        />
        <DataTable
          columns={[
            { key: "name", header: "Report", cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
            { key: "owner", header: "Owner", cell: (r) => r.owner },
            { key: "schedule", header: "Schedule", cell: (r) => r.schedule },
            { key: "lastRun", header: "Last run", cell: (r) => r.lastRun },
            { key: "format", header: "Format", cell: (r) => <Badge variant="outline">{r.format}</Badge> },
            { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={filtered}
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Run history</p>
        <DataTable
          columns={[
            { key: "report", header: "Report", cell: (r) => r.report },
            { key: "runAt", header: "Run at", cell: (r) => r.runAt },
            { key: "runBy", header: "Run by", cell: (r) => r.runBy },
            { key: "duration", header: "Duration", cell: (r) => r.duration },
            { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={runHistory}
        />
      </div>
    </div>
  );
}
