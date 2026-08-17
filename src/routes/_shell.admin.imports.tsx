import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Database,
  FileUp,
  Filter,
  ListChecks,
  Plus,
  RefreshCw,
  ShieldCheck,
  Table2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/admin/imports")({
  head: () => ({
    meta: [
      { title: "Data & Import Center — Policy Bear CRM" },
      {
        name: "description",
        content: "Import, export, sync and audit every data source connected to the platform.",
      },
      { property: "og:title", content: "Data & Import Center — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Import, export, sync and audit every data source connected to the platform.",
      },
    ],
  }),
  component: DataCenterPage,
});

/* -------------------------------------------------------------------------- */
/* Types & seed data                                                          */
/* -------------------------------------------------------------------------- */

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

interface ExportJob {
  id: string;
  scope: string;
  format: "CSV" | "XLSX" | "JSON";
  rows: number;
  status: "Ready" | "Expired" | "Preparing" | "Failed";
  requestedAt: string;
  requestedBy: string;
  expiresAt: string;
}

interface DataConnector {
  id: string;
  name: string;
  category: string;
  direction: "Inbound" | "Outbound" | "Bidirectional";
  status: "Connected" | "Degraded" | "Paused" | "Disconnected";
  lastSyncAt: string;
  records24h: number;
  latencyMs: number;
}

interface QualityRule {
  id: string;
  name: string;
  table: string;
  issues: number;
  total: number;
  severity: "Critical" | "Warning" | "Clean";
}

interface MappingTemplate {
  id: string;
  name: string;
  fields: number;
  lastUsed: string;
  source: string;
}

const importJobs: ImportJob[] = [
  { id: "IMP-401", source: "Publisher Leads", fileName: "bluerock_leads_aug04.csv", rows: 1240, errors: 3, status: "Completed", startedAt: "2026-08-04 06:15", startedBy: "Marcus Hale" },
  { id: "IMP-400", source: "Carrier Commission Statement", fileName: "ambetter_commissions_jul.xlsx", rows: 512, errors: 0, status: "Completed", startedAt: "2026-08-03 22:00", startedBy: "Nadia Bloom" },
  { id: "IMP-399", source: "Publisher Leads", fileName: "northline_leads_aug03.csv", rows: 860, errors: 42, status: "Failed", startedAt: "2026-08-03 06:10", startedBy: "Marcus Hale" },
  { id: "IMP-398", source: "Employee Roster", fileName: "hr_roster_update.csv", rows: 24, errors: 0, status: "Completed", startedAt: "2026-08-02 09:30", startedBy: "Dana Reyes" },
  { id: "IMP-397", source: "Chargeback Feed", fileName: "carrier_chargebacks_q3.csv", rows: 96, errors: 5, status: "Completed", startedAt: "2026-08-01 14:05", startedBy: "Nadia Bloom" },
  { id: "IMP-396", source: "Publisher Leads", fileName: "sunbelt_leads_aug01.csv", rows: 0, errors: 0, status: "Running", startedAt: "2026-08-04 08:02", startedBy: "Marcus Hale" },
];

const exportJobs: ExportJob[] = [
  { id: "EXP-112", scope: "Revenue ledger (This month)", format: "CSV", rows: 1482, status: "Ready", requestedAt: "2026-08-04 09:12", requestedBy: "Nadia Bloom", expiresAt: "2026-08-11 09:12" },
  { id: "EXP-111", scope: "Payroll run #W32", format: "XLSX", rows: 38, status: "Ready", requestedAt: "2026-08-03 17:45", requestedBy: "Nadia Bloom", expiresAt: "2026-08-10 17:45" },
  { id: "EXP-110", scope: "DNC list (all active)", format: "CSV", rows: 4820, status: "Ready", requestedAt: "2026-08-03 11:20", requestedBy: "Priya Raman", expiresAt: "2026-08-10 11:20" },
  { id: "EXP-109", scope: "Call recordings metadata", format: "JSON", rows: 8920, status: "Expired", requestedAt: "2026-07-28 08:00", requestedBy: "Marcus Hale", expiresAt: "2026-08-04 08:00" },
  { id: "EXP-108", scope: "Contacts & policies", format: "CSV", rows: 6540, status: "Preparing", requestedAt: "2026-08-04 09:30", requestedBy: "Owen Klein", expiresAt: "2026-08-11 09:30" },
];

const connectors: DataConnector[] = [
  { id: "CONN-1", name: "CallTools Dialer", category: "Telephony", direction: "Bidirectional", status: "Connected", lastSyncAt: "2 min ago", records24h: 1840, latencyMs: 142 },
  { id: "CONN-2", name: "Ringba Traffic", category: "Publisher", direction: "Inbound", status: "Connected", lastSyncAt: "5 min ago", records24h: 3200, latencyMs: 96 },
  { id: "CONN-3", name: "Ambetter Commissions", category: "Carrier", direction: "Inbound", status: "Degraded", lastSyncAt: "1 hr ago", records24h: 512, latencyMs: 480 },
  { id: "CONN-4", name: "HealthSherpa Quotes", category: "Enrollment", direction: "Inbound", status: "Connected", lastSyncAt: "12 min ago", records24h: 890, latencyMs: 310 },
  { id: "CONN-5", name: "Payline Payouts", category: "Finance", direction: "Outbound", status: "Paused", lastSyncAt: "2 days ago", records24h: 0, latencyMs: 620 },
];

const qualityRules: QualityRule[] = [
  { id: "Q-1", name: "Missing phone numbers", table: "contacts", issues: 0, total: 12440, severity: "Clean" },
  { id: "Q-2", name: "Duplicate email addresses", table: "contacts", issues: 12, total: 12440, severity: "Warning" },
  { id: "Q-3", name: "Unmapped dispositions", table: "telephony_calls", issues: 3, total: 8920, severity: "Warning" },
  { id: "Q-4", name: "Orphaned sales without policy", table: "sales", issues: 0, total: 1482, severity: "Clean" },
  { id: "Q-5", name: "Missing agent_user_id", table: "telephony_calls", issues: 7, total: 8920, severity: "Critical" },
];

const mappingTemplates: MappingTemplate[] = [
  { id: "MAP-1", name: "Standard Publisher Lead Feed", fields: 14, lastUsed: "2026-08-04", source: "Publisher Leads" },
  { id: "MAP-2", name: "Carrier Commission Statement (Ambetter)", fields: 9, lastUsed: "2026-08-03", source: "Carrier Commission Statement" },
  { id: "MAP-3", name: "HR Roster CSV", fields: 11, lastUsed: "2026-08-02", source: "Employee Roster" },
  { id: "MAP-4", name: "Chargeback Feed (generic)", fields: 7, lastUsed: "2026-08-01", source: "Chargeback Feed" },
  { id: "MAP-5", name: "DNC Import (single column)", fields: 3, lastUsed: "2026-07-30", source: "DNC List" },
];

const exportScopes = [
  "Revenue ledger",
  "Payroll run",
  "DNC list",
  "Contacts & policies",
  "Call recordings metadata",
  "Audit logs",
  "Agent scoreboard",
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function connectorTone(status: DataConnector["status"]) {
  switch (status) {
    case "Connected":
      return "success";
    case "Degraded":
      return "warning";
    case "Paused":
      return "default";
    case "Disconnected":
      return "danger";
  }
}

function qualityTone(severity: QualityRule["severity"]) {
  switch (severity) {
    case "Clean":
      return "success";
    case "Warning":
      return "warning";
    case "Critical":
      return "danger";
  }
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

function DataCenterPage() {
  const [activeTab, setActiveTab] = useState("imports");
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(mappingTemplates[0]?.id ?? "");
  const [selectedScope, setSelectedScope] = useState<string>(exportScopes[0] ?? "");
  const [selectedFormat, setSelectedFormat] = useState<ExportJob["format"]>("CSV");

  const totalRows = importJobs.reduce((s, j) => s + j.rows, 0);
  const totalErrors = importJobs.reduce((s, j) => s + j.errors, 0);
  const failedImports = importJobs.filter((j) => j.status === "Failed").length;
  const readyExports = exportJobs.filter((j) => j.status === "Ready").length;
  const connectedCount = connectors.filter((c) => c.status === "Connected").length;
  const qualityIssues = qualityRules.reduce((s, r) => s + r.issues, 0);

  function handleStartImport() {
    toast.success("Import job queued");
    setImportOpen(false);
  }

  function handleStartExport() {
    toast.success(`${selectedFormat} export is being prepared`);
    setExportOpen(false);
  }

  function handleDownload(row: ExportJob) {
    if (row.status === "Expired") {
      toast.error("This export has expired. Please generate a new one.");
      return;
    }
    if (row.status === "Preparing") {
      toast.info("Export is still being prepared.");
      return;
    }
    toast.success(`Downloading ${row.scope}`);
  }

  function handleSyncConnector(name: string) {
    toast.success(`Sync triggered for ${name}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Data & Import Center"
        description="Import, export, sync and audit every data source connected to the platform."
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UploadCloud className="mr-1.5 size-4" />
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
                        <SelectItem value="DNC List">DNC List</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>File</Label>
                    <Input type="file" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mapping template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
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
                  <Button variant="outline" onClick={() => setImportOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleStartImport}>Start import</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  <ArrowDownToLine className="mr-1.5 size-4" />
                  New export
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New export</DialogTitle>
                  <DialogDescription>Generate a downloadable snapshot of any module.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Scope</Label>
                    <Select value={selectedScope} onValueChange={setSelectedScope}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {exportScopes.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Format</Label>
                    <Select
                      value={selectedFormat}
                      onValueChange={(v) => setSelectedFormat(v as ExportJob["format"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CSV">CSV</SelectItem>
                        <SelectItem value="XLSX">XLSX</SelectItem>
                        <SelectItem value="JSON">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setExportOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleStartExport}>Generate export</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Imports (30d)"
          value={importJobs.length}
          tone="brand"
          icon={<FileUp className="size-4" />}
          hint={`${totalRows.toLocaleString()} rows processed`}
        />
        <StatCard
          label="Import errors"
          value={totalErrors}
          tone={totalErrors > 0 ? "warning" : "default"}
          hint={`${failedImports} failed jobs`}
        />
        <StatCard
          label="Exports ready"
          value={readyExports}
          tone="info"
          icon={<ArrowDownToLine className="size-4" />}
          hint={`${exportJobs.length} total jobs`}
        />
        <StatCard
          label="Connectors live"
          value={`${connectedCount}/${connectors.length}`}
          tone={connectedCount === connectors.length ? "success" : "warning"}
          icon={<Database className="size-4" />}
        />
        <StatCard
          label="Data quality"
          value={qualityIssues}
          tone={qualityIssues > 0 ? "warning" : "success"}
          icon={<ShieldCheck className="size-4" />}
          hint={qualityIssues > 0 ? "issues need review" : "all checks clean"}
        />
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="imports">
            <UploadCloud className="mr-1.5 size-3.5" />
            Imports
          </TabsTrigger>
          <TabsTrigger value="exports">
            <ArrowDownToLine className="mr-1.5 size-3.5" />
            Exports
          </TabsTrigger>
          <TabsTrigger value="sync">
            <RefreshCw className="mr-1.5 size-3.5" />
            Sync connectors
          </TabsTrigger>
          <TabsTrigger value="quality">
            <Filter className="mr-1.5 size-3.5" />
            Data quality
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Table2 className="mr-1.5 size-3.5" />
            Mappings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="imports" className="space-y-4">
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
            rows={importJobs}
          />
        </TabsContent>

        <TabsContent value="exports" className="space-y-4">
          <DataTable
            columns={[
              { key: "id", header: "Job", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
              { key: "scope", header: "Scope", cell: (r) => r.scope },
              { key: "format", header: "Format", cell: (r) => <Badge variant="secondary">{r.format}</Badge> },
              { key: "rows", header: "Rows", cell: (r) => r.rows.toLocaleString(), align: "right" },
              { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
              { key: "requestedAt", header: "Requested", cell: (r) => r.requestedAt },
              { key: "requestedBy", header: "By", cell: (r) => r.requestedBy },
              { key: "expiresAt", header: "Expires", cell: (r) => r.expiresAt },
              {
                key: "download",
                header: "",
                cell: (r) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(r)}
                    disabled={r.status === "Preparing"}
                  >
                    <ArrowDownToLine className="size-4" />
                  </Button>
                ),
                align: "center",
              },
            ]}
            rows={exportJobs}
          />
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            {connectors.map((c) => (
              <Card key={c.id} className="p-4 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground">{c.name}</p>
                      <Badge variant="outline">{c.category}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.direction} · Last sync {c.lastSyncAt} · {c.latencyMs}ms latency
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge status={c.status} />
                    <Button size="sm" variant="ghost" onClick={() => handleSyncConnector(c.name)}>
                      <RefreshCw className="mr-1.5 size-3.5" />
                      Sync
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Records (24h)</p>
                    <p className="text-lg font-semibold text-foreground">{c.records24h.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Latency</p>
                    <p className={cn("text-lg font-semibold", c.latencyMs > 500 ? "text-destructive" : c.latencyMs > 250 ? "text-warning" : "text-success")}>
                      {c.latencyMs}ms
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            {qualityRules.map((q) => {
              const pct = Math.round(((q.total - q.issues) / q.total) * 100);
              return (
                <Card key={q.id} className="p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{q.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Table: <span className="font-mono">{q.table}</span>
                      </p>
                    </div>
                    <Badge
                      variant={q.severity === "Clean" ? "default" : q.severity === "Warning" ? "secondary" : "destructive"}
                      className={cn(
                        q.severity === "Clean" && "bg-success/12 text-success",
                        q.severity === "Warning" && "bg-warning/25 text-brand-tan",
                      )}
                    >
                      {q.severity}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{q.issues} issues / {q.total.toLocaleString()} rows</span>
                      <span className="font-medium text-foreground">{pct}% clean</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <ListChecks className="size-4 text-brand" />
              <p className="text-sm font-semibold text-foreground">Mapping templates</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mappingTemplates.map((m) => (
                <div
                  key={m.id}
                  className="group relative rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <Badge variant="secondary" className="shrink-0">
                      {m.id}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.fields} mapped fields · last used {m.lastUsed}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Source: <span className="font-medium text-foreground">{m.source}</span>
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setSelectedTemplate(m.id);
                        setImportOpen(true);
                      }}
                    >
                      <ArrowUpFromLine className="mr-1 size-3" />
                      Use for import
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick actions footer */}
      <Card className="p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-success" />
            <p className="text-sm font-medium text-foreground">Daily data health check</p>
            <Badge variant="secondary">Passed</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("DNC export generated")}>
              <ShieldCheck className="mr-1.5 size-3.5" />
              Export DNC list
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("All connectors refreshed")}>
              <RefreshCw className="mr-1.5 size-3.5" />
              Sync all connectors
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Quality report downloaded")}>
              <XCircle className="mr-1.5 size-3.5" />
              Download quality report
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
