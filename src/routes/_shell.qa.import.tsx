import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_shell/qa/import")({
  head: () => ({
    meta: [
      { title: "Smart QC Import — Policy Bear CRM" },
      { name: "description", content: "Bulk import QA scoring data with column mapping and row-level validation." },
      { property: "og:title", content: "Smart QC Import — Policy Bear CRM" },
      { property: "og:description", content: "Bulk import QA scoring data with column mapping and row-level validation." },
    ],
  }),
  component: QAImportPage,
});

const requiredFields = ["Call ID", "Agent", "Reviewer", "Score", "Outcome", "Reason"];
const sourceColumns = ["call_id", "agent_name", "reviewer_name", "qa_score", "result", "notes", "publisher_id", "unused_1"];

interface PreviewRow {
  row: number;
  callId: string;
  agent: string;
  reviewer: string;
  score: string;
  outcome: string;
  error?: string;
}

const previewRows: PreviewRow[] = [
  { row: 2, callId: "CT-482119", agent: "Marcus Nair", reviewer: "Hannah Kovac", score: "88", outcome: "Valid" },
  { row: 3, callId: "CT-482136", agent: "Priya Whitfield", reviewer: "Hannah Kovac", score: "61", outcome: "Invalid" },
  { row: 4, callId: "", agent: "Diego Bennett", reviewer: "Hannah Kovac", score: "77", outcome: "Valid", error: "Missing Call ID" },
  { row: 5, callId: "CT-482158", agent: "Owen Fletcher", reviewer: "Hannah Kovac", score: "142", outcome: "Valid", error: "Score out of range (0-100)" },
  { row: 6, callId: "CT-482170", agent: "Isabel Moreno", reviewer: "", score: "90", outcome: "Valid", error: "Missing Reviewer" },
  { row: 7, callId: "CT-482182", agent: "Caleb Sutton", reviewer: "Hannah Kovac", score: "73", outcome: "Returned" },
];

function QAImportPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({
    "Call ID": "call_id",
    Agent: "agent_name",
    Reviewer: "reviewer_name",
    Score: "qa_score",
    Outcome: "result",
    Reason: "notes",
  });
  const [imported, setImported] = useState(false);

  const errorRows = previewRows.filter((r) => r.error);
  const validRows = previewRows.length - errorRows.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quality Control"
        title="Smart QC Import"
        description="Upload a spreadsheet of external QA scores, map columns, validate, and bulk-import into the review queue."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rows detected" value={previewRows.length} icon={<FileSpreadsheet className="size-4" />} />
        <StatCard label="Valid rows" value={validRows} tone="success" icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Rows with errors" value={errorRows.length} tone="danger" icon={<AlertTriangle className="size-4" />} />
        <StatCard label="Mapped fields" value={`${Object.values(mapping).filter(Boolean).length}/${requiredFields.length}`} tone="brand" />
      </div>

      <Card className="p-5 shadow-card">
        <p className="mb-3 text-sm font-semibold text-foreground">1. Upload file</p>
        {!fileName ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface/40 py-10 text-center hover:border-brand/40 hover:bg-brand/5">
            <UploadCloud className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Drop a CSV or XLSX file here, or click to browse</p>
            <p className="text-xs text-muted-foreground">Supports up to 10,000 rows · .csv, .xlsx</p>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "qc_scores_august.csv")}
            />
          </label>
        ) : (
          <div className="flex items-center justify-between rounded-md border border-border bg-surface/50 p-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-brand" />
              <span className="text-sm font-medium text-foreground">{fileName}</span>
              <Badge variant="outline">{previewRows.length} rows</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setFileName(null); setImported(false); }}>Replace</Button>
          </div>
        )}
      </Card>

      {fileName && (
        <>
          <Card className="p-5 shadow-card">
            <p className="mb-3 text-sm font-semibold text-foreground">2. Map columns</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {requiredFields.map((field) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-sm text-foreground">{field}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <Select
                    value={mapping[field] ?? ""}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [field]: v }))}
                  >
                    <SelectTrigger className="h-8"><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      {sourceColumns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden p-0 shadow-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <p className="text-sm font-semibold text-foreground">3. Validation preview</p>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="border-success/25 bg-success/12 text-success">{validRows} valid</Badge>
                <Badge variant="outline" className="border-destructive/25 bg-destructive/12 text-destructive">{errorRows.length} errors</Badge>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface/70 hover:bg-surface/70">
                    <TableHead>Row</TableHead>
                    <TableHead>Call ID</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Validation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((r) => (
                    <TableRow key={r.row} className={r.error ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{r.row}</TableCell>
                      <TableCell className={!r.callId ? "text-destructive" : ""}>{r.callId || "—"}</TableCell>
                      <TableCell>{r.agent}</TableCell>
                      <TableCell className={!r.reviewer ? "text-destructive" : ""}>{r.reviewer || "—"}</TableCell>
                      <TableCell>{r.score}</TableCell>
                      <TableCell><StatusBadge status={r.outcome} /></TableCell>
                      <TableCell>
                        {r.error ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                            <AlertTriangle className="size-3.5" /> {r.error}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                            <CheckCircle2 className="size-3.5" /> OK
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            {imported ? (
              <span className="text-sm font-medium text-success">
                Import complete — {validRows} reviews added to the QA queue, {errorRows.length} rows skipped.
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Fix flagged rows or proceed to import valid rows only.</span>
            )}
            <Button onClick={() => setImported(true)} disabled={imported} className="gap-1.5">
              <UploadCloud className="size-4" /> Import {validRows} valid rows
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
