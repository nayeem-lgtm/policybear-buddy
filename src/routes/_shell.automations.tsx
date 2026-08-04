import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Workflow, Mail, Zap, Pause, Plus, Clock, Mailbox, UserCheck, BookOpen } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { useFilters, unique } from "@/lib/use-filters";
import { automations, type Automation } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/automations")({
  head: () => ({
    meta: [
      { title: "HR Automations — Policy Bear CRM" },
      {
        name: "description",
        content: "Onboarding email and training automation builder with step sequences and toggles.",
      },
      { property: "og:title", content: "HR Automations — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Onboarding email and training automation builder with step sequences and toggles.",
      },
    ],
  }),
  component: AutomationsPage,
});

const stepLibrary = [
  { icon: Mail, label: "Send email" },
  { icon: Clock, label: "Wait" },
  { icon: BookOpen, label: "Assign course" },
  { icon: UserCheck, label: "Notify manager" },
];

function buildSteps(a: Automation) {
  const steps = [stepLibrary[0], stepLibrary[1], stepLibrary[2], stepLibrary[3]];
  return Array.from({ length: a.steps }, (_, i) => steps[i % steps.length]);
}

function AutomationsPage() {
  const [rows, setRows] = useState<Automation[]>(automations);
  const [selected, setSelected] = useState<Automation | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const channelOptions = useMemo(() => unique(rows, (a) => a.channel), [rows]);
  const statusOptions = useMemo(() => unique(rows, (a) => a.status), [rows]);
  const ownerOptions = useMemo(() => unique(rows, (a) => a.owner), [rows]);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(rows, {
    searchFields: (a) => [a.name, a.trigger, a.audience],
    filters: {
      channel: (a) => a.channel,
      status: (a) => a.status,
      owner: (a) => a.owner,
    },
  });

  const activeCount = rows.filter((a) => a.status === "Active").length;
  const totalSent = rows.reduce((s, a) => s + a.sent30d, 0);

  function toggleStatus(id: string) {
    setRows((r) =>
      r.map((a) =>
        a.id === id ? { ...a, status: a.status === "Active" ? "Paused" : "Active" } : a,
      ),
    );
  }

  const columns: Column<Automation>[] = [
    {
      key: "name",
      header: "Automation",
      cell: (a) => (
        <div>
          <p className="font-medium text-foreground">{a.name}</p>
          <p className="text-xs text-muted-foreground">{a.trigger}</p>
        </div>
      ),
    },
    { key: "audience", header: "Audience", cell: (a) => a.audience },
    { key: "channel", header: "Channel", cell: (a) => <Badge variant="secondary">{a.channel}</Badge> },
    { key: "steps", header: "Steps", cell: (a) => a.steps, align: "center" },
    { key: "sent", header: "Sent (30d)", cell: (a) => a.sent30d, align: "right" },
    { key: "openRate", header: "Open Rate", cell: (a) => a.openRate, align: "right" },
    { key: "lastRun", header: "Last Run", cell: (a) => a.lastRun },
    {
      key: "status",
      header: "Status",
      cell: (a) => (
        <div className="flex items-center gap-2">
          <Switch checked={a.status === "Active"} onCheckedChange={() => toggleStatus(a.id)} onClick={(e) => e.stopPropagation()} />
          <StatusBadge status={a.status} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="HR Automations"
        description="Onboarding email and training automation builder — triggers, step sequences and status controls."
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> New automation
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Automations" value={rows.length} icon={<Workflow className="size-4" />} />
        <StatCard label="Active" value={activeCount} tone="success" icon={<Zap className="size-4" />} />
        <StatCard label="Paused/Draft" value={rows.length - activeCount} tone="warning" icon={<Pause className="size-4" />} />
        <StatCard label="Messages Sent (30d)" value={totalSent} icon={<Mailbox className="size-4" />} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, trigger or audience…"
        filters={[
          { key: "channel", label: "Channel", options: channelOptions },
          { key: "status", label: "Status", options: statusOptions },
          { key: "owner", label: "Owner", options: ownerOptions },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => setSelected(row)}
        footer={<span>{filtered.length} of {rows.length} automations</span>}
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  Trigger: {selected.trigger} · Owner: {selected.owner}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selected.status} />
                  <Badge variant="secondary">{selected.channel}</Badge>
                  <Badge variant="secondary">{selected.audience}</Badge>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Step sequence</p>
                  <div className="space-y-2">
                    {buildSteps(selected).map((s, i) => {
                      const Icon = s!.icon;
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-md border border-border p-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                            {i + 1}
                          </span>
                          <Icon className="size-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{s!.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New automation</DialogTitle>
            <DialogDescription>Define a trigger and the audience for this workflow.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Probation Review Reminder" />
            </div>
            <div className="grid gap-1.5">
              <Label>Trigger</Label>
              <Input placeholder="e.g. 90 days after hire date" />
            </div>
            <div className="grid gap-1.5">
              <Label>Channel</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                <SelectContent>
                  {["Email", "In-App", "SMS", "Task"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setNewOpen(false);
                toast.success("Automation saved as draft.");
              }}
            >
              Save automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
