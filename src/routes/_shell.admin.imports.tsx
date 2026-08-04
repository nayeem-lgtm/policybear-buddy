import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileUp, ListChecks, Plus } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable } from "@/components/crm/DataTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_shell/admin/imports")({
  head: () => ({
    meta: [
      { title: "Import Center — Policy Bear CRM" },
      {
        name: "description",
        content: "Track import jobs, row processing outcomes and reusable mapping templates.",
      },
      { property: "og:title", content: "Import Center — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Track import jobs, row processing outcomes and reusable mapping templates.",
      },
    ],
  }),
  component: ImportCenterPage,
});

interface ImportJob {
  id: string;
  source: string;
  fileName: string;
  rows: number;
  errors: number;
  status: "Completed" | "Failed" | "Running" | "Queued";
  startedAt: string;
  startedBy: string;
}

const jobs: ImportJob[] = [
  { id: "IMP-401", source: "Publisher Leads", fileName: "bluerock_leads_aug04.csv", rows: 1240, errors: 3, status: "Completed", startedAt: "2026-08-04 06:15", startedBy: "Marcus Hale" },
  { id: "IMP-400", source: "Carrier Commission Statement", fileName: "ambetter_commissions_jul.xlsx", rows: 512, errors: 0, status: "Completed", startedAt: "2026-08-03 22:00", startedBy: "Nadia Bloom" },
  { id: "IMP-399", source: "Publisher Leads", fileName: "northline_leads_aug03.csv", rows: 860, errors: 42, status: "Failed", startedAt: "2026-08-03 06:10", startedBy: "Marcus Hale" },
  { id: "IMP-398", source: "Employee Roster", fileName: "hr_roster_update.csv", rows: 24, errors: 0, status: "Completed", startedAt: "2026-08-02 09:30", startedBy: "Dana Reyes" },
  { id: "IMP-397", source: "Chargeback Feed", fileName: "carrier_chargebacks_q3.csv", rows: 96, errors: 5, status: "Completed", startedAt: "2026-08-01 14:05", startedBy: "Nadia Bloom" },
  { id: "IMP-396", source: "Publisher Leads", fileName: "sunbelt_leads_aug01.csv", rows: 0, errors: 0, status: "Running", startedAt: "2026-08-04 08:02", startedBy: "Marcus Hale" },
];

const mappingTemplates = [
  { id: "MAP-1", name: "Standard Publisher Lead Feed", fields: 14, lastUsed: "2026-08-04" },
  { id: "MAP-2", name: "Carrier Commission Statement (Ambetter)", fields: 9, lastUsed: "2026-08-03" },
  { id: "MAP-3", name: "HR Roster CSV", fields: 11, lastUsed: "2026-08-02" },
  { id: "MAP-4", name: "Chargeback Feed (generic)", fields: 7, lastUsed: "2026-08-01" },
];

function ImportCenterPage() {
  const [open, setOpen] = useState(false);
  const totalRows = jobs.reduce((s, j) => s + j.rows, 0);
  const totalErrors = jobs.reduce((s, j) => s + j.errors, 0);
  const failed = jobs.filter((j) => j.status === "Failed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Import Center"
        description="Monitor data import jobs, row-level outcomes, and reusable field mappings."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                New import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New import</DialogTitle>
                <DialogDescription>Upload a file and choose a mapping template.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Select defaultValue="Publisher Leads">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Publisher Leads">Publisher Leads</SelectItem>
                      <SelectItem value="Carrier Commission Statement">Carrier Commission Statement</SelectItem>
                      <SelectItem value="Employee Roster">Employee Roster</SelectItem>
                      <SelectItem value="Chargeback Feed">Chargeback Feed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>File</Label>
                  <Input type="file" />
                </div>
                <div className="space-y-1.5">
                  <Label>Mapping template</Label>
                  <Select defaultValue={mappingTemplates[0]!.id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mappingTemplates.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setOpen(false)}>Start import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jobs (30d)" value={jobs.length} tone="brand" icon={<FileUp className="size-4" />} />
        <StatCard label="Rows processed" value={totalRows.toLocaleString()} tone="info" />
        <StatCard label="Row errors" value={totalErrors} tone={totalErrors > 0 ? "warning" : "default"} />
        <StatCard label="Failed jobs" value={failed} tone={failed > 0 ? "danger" : "default"} />
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Import jobs</p>
        <DataTable
          columns={[
            { key: "id", header: "Job", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
            { key: "source", header: "Source", cell: (r) => r.source },
            { key: "fileName", header: "File", cell: (r) => <span className="font-mono text-xs">{r.fileName}</span> },
            { key: "rows", header: "Rows", cell: (r) => r.rows.toLocaleString(), align: "right" },
            {
              key: "errors",
              header: "Errors",
              cell: (r) => (r.errors > 0 ? <span className="text-destructive">{r.errors}</span> : "0"),
              align: "right",
            },
            { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            { key: "startedAt", header: "Started", cell: (r) => r.startedAt },
            { key: "startedBy", header: "By", cell: (r) => r.startedBy },
          ]}
          rows={jobs}
        />
      </div>

      <Card className="p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <ListChecks className="size-4 text-brand" />
          <p className="text-sm font-semibold text-foreground">Mapping templates</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {mappingTemplates.map((m) => (
            <div key={m.id} className="rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">{m.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {m.fields} mapped fields · last used {m.lastUsed}
              </p>
              <Badge variant="secondary" className="mt-2">
                {m.id}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
