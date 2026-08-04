import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Folder, Upload } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable } from "@/components/crm/DataTable";
import { useFilters, unique } from "@/lib/use-filters";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { documents } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Policy Bear CRM" },
      {
        name: "description",
        content: "Document library with folder browsing, file metadata and preview.",
      },
      { property: "og:title", content: "Documents — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Document library with folder browsing, file metadata and preview.",
      },
    ],
  }),
  component: DocumentsPage,
});

type Doc = (typeof documents)[number];

function DocumentsPage() {
  const [folder, setFolder] = useState<string>("All");
  const [selected, setSelected] = useState<Doc | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const folders = useMemo(() => ["All", ...unique(documents, (d) => d.category)], []);

  const byFolder = folder === "All" ? documents : documents.filter((d) => d.category === folder);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(byFolder, {
    searchFields: (r) => [r.name, r.owner],
    filters: { access: (r) => r.access },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control"
        title="Documents"
        description="Central library for company documents, policies and carrier files."
        actions={
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="mr-1.5 size-4" />
                Upload document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload document</DialogTitle>
                <DialogDescription>Add a new file to the document library.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>File</Label>
                  <Input type="file" />
                </div>
                <div className="space-y-1.5">
                  <Label>Folder</Label>
                  <Input placeholder="e.g. Compliance" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setUploadOpen(false)}>Upload</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total documents" value={documents.length} tone="brand" icon={<FileText className="size-4" />} />
        <StatCard label="Folders" value={folders.length - 1} tone="info" />
        <StatCard label="HR only" value={documents.filter((d) => d.access === "HR Only").length} tone="warning" />
        <StatCard label="Executive" value={documents.filter((d) => d.access === "Executive").length} tone="default" />
      </div>

      <div className="flex flex-wrap gap-2">
        {folders.map((f) => (
          <button
            key={f}
            onClick={() => setFolder(f)}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
              (folder === f
                ? "border-brand bg-brand/10 text-brand"
                : "border-border text-muted-foreground hover:bg-muted")
            }
          >
            <Folder className="size-3.5" />
            {f}
          </button>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search documents…"
        filters={[{ key: "access", label: "Access", options: unique(documents, (r) => r.access) }]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable
        onRowClick={(row) => setSelected(row)}
        columns={[
          { key: "name", header: "File", cell: (r) => <span className="font-medium text-foreground">{r.name}</span> },
          { key: "category", header: "Folder", cell: (r) => <Badge variant="secondary">{r.category}</Badge> },
          { key: "owner", header: "Owner", cell: (r) => r.owner },
          { key: "size", header: "Size", cell: (r) => r.size, align: "right" },
          { key: "updated", header: "Updated", cell: (r) => r.updated },
          { key: "access", header: "Access", cell: (r) => <StatusBadge status={r.access} tone="neutral" /> },
        ]}
        rows={filtered}
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.category} · {selected.version} · updated {selected.updated}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <div className="flex aspect-[4/5] items-center justify-center rounded-md border border-dashed border-border bg-muted/40">
                  <FileText className="size-10 text-muted-foreground" />
                </div>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Owner</dt>
                    <dd className="text-foreground">{selected.owner}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Size</dt>
                    <dd className="text-foreground">{selected.size}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Access</dt>
                    <dd className="text-foreground">{selected.access}</dd>
                  </div>
                </dl>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
