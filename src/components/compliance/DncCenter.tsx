/**
 * DNC & Compliance Center — the dedicated Do-Not-Call workspace.
 *
 * Add or import numbers, release them, and search the immutable compliance
 * audit log of every add / release / import / blocked dial attempt.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Ban,
  Download,
  FileUp,
  History,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/crm/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DNC_ACTIONS,
  DNC_ACTION_LABEL,
  DNC_ACTION_TONE,
  DNC_REASONS,
  DNC_SCOPES,
  DNC_SCOPE_TONE,
  formatPhone,
} from "@/lib/dnc-shared";
import {
  addDncNumber,
  getDncCenter,
  importDncNumbers,
  releaseDncNumber,
} from "@/lib/dnc.functions";
import { cn } from "@/lib/utils";

function when(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DncCenter() {
  const queryClient = useQueryClient();
  const load = useServerFn(getDncCenter);
  const add = useServerFn(addDncNumber);
  const bulk = useServerFn(importDncNumbers);
  const release = useServerFn(releaseDncNumber);

  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "released">("active");
  const [action, setAction] = useState("all");
  const [days, setDays] = useState("90");

  const [form, setForm] = useState({
    phone: "",
    contactName: "",
    reason: DNC_REASONS[0] as string,
    scope: "internal" as string,
    notes: "",
  });
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importReason, setImportReason] = useState("Federal DNC registry");
  const [importScope, setImportScope] = useState("federal");

  const filters = { search, scope, status, action, days: Number(days) };
  const center = useQuery({
    queryKey: ["dnc-center", filters],
    queryFn: () => load({ data: filters }),
    refetchInterval: 20000,
  });
  const data = center.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dnc-center"] });

  const addMutation = useMutation({
    mutationFn: () =>
      add({
        data: {
          phone: form.phone,
          reason: form.reason,
          scope: form.scope as (typeof DNC_SCOPES)[number],
          source: "manual",
          ...(form.contactName ? { contactName: form.contactName } : {}),
          ...(form.notes ? { notes: form.notes } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Number added to the Do-Not-Call list");
      setForm({ phone: "", contactName: "", reason: DNC_REASONS[0], scope: "internal", notes: "" });
      setAddOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: () =>
      bulk({
        data: {
          text: importText,
          reason: importReason,
          scope: importScope as (typeof DNC_SCOPES)[number],
        },
      }),
    onSuccess: (res) => {
      toast.success(
        `${res.added} number${res.added === 1 ? "" : "s"} imported${
          res.skipped.length ? ` · ${res.skipped.length} skipped` : ""
        }`,
      );
      setImportText("");
      setImportOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const releaseMutation = useMutation({
    mutationFn: (id: string) => release({ data: { id } }),
    onSuccess: () => {
      toast.success("Released — the audit trail keeps the history");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const entries = data?.entries ?? [];
  const events = data?.events ?? [];

  const exportCsv = () => {
    const rows = [
      ["phone", "contact", "reason", "scope", "source", "active", "added_at"],
      ...entries.map((e) => [
        e.phone_e164,
        e.contact_name ?? "",
        e.reason,
        e.scope,
        e.source,
        String(e.active),
        e.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `dnc-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scopeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) map.set(e.scope, (map.get(e.scope) ?? 0) + 1);
    return map;
  }, [entries]);

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------- headline */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Numbers on DNC"
          value={data?.totals.active ?? 0}
          hint="Active suppressions across every scope"
          tone="danger"
          icon={<ShieldOff className="size-5" />}
        />
        <StatCard
          label="Dials blocked"
          value={data?.totals.blocked ?? 0}
          hint={`Automatically stopped in the last ${days} days`}
          tone="warning"
          icon={<Ban className="size-5" />}
        />
        <StatCard
          label="Added in window"
          value={data?.totals.addedWindow ?? 0}
          hint="Manual adds plus registry imports"
          tone="brand"
          icon={<ShieldAlert className="size-5" />}
        />
        <StatCard
          label="Audit events"
          value={events.length}
          hint="Every compliance action is recorded"
          tone="info"
          icon={<History className="size-5" />}
        />
      </div>

      {/* --------------------------------------------------------------- actions */}
      <Card className="flex flex-wrap items-center gap-2 rounded-2xl p-4 shadow-card">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search a number, name or staff member…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scopes</SelectItem>
            {DNC_SCOPES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="released">Released</SelectItem>
            <SelectItem value="all">All entries</SelectItem>
          </SelectContent>
        </Select>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["7", "30", "90", "365"].map((d) => (
              <SelectItem key={d} value={d}>
                Last {d} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="mx-1 hidden h-8 sm:block" />

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Ban className="mr-2 size-4" /> Add number
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a number to the DNC list</DialogTitle>
              <DialogDescription>
                Dialing this number is blocked immediately, everywhere in Policy Bear, and the action is
                written to the compliance audit log.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Phone number</Label>
                <Input
                  placeholder="(555) 010-1234"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Contact name (optional)</Label>
                <Input
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Reason</Label>
                  <Select value={form.reason} onValueChange={(v) => setForm((f) => ({ ...f, reason: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DNC_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Scope</Label>
                  <Select value={form.scope} onValueChange={(v) => setForm((f) => ({ ...f, scope: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DNC_SCOPES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Notes (optional)</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={form.phone.replace(/\D/g, "").length < 7 || addMutation.isPending}
                onClick={() => addMutation.mutate()}
              >
                Add to DNC
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <FileUp className="mr-2 size-4" /> Bulk import
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import numbers</DialogTitle>
              <DialogDescription>
                Paste up to 500 numbers, one per line or comma separated. Unusable values are reported back
                and skipped.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Textarea
                rows={8}
                placeholder={"+15550101234\n5550105678, 5550109999"}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Reason</Label>
                  <Select value={importReason} onValueChange={setImportReason}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DNC_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Scope</Label>
                  <Select value={importScope} onValueChange={setImportScope}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DNC_SCOPES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={importText.trim().length < 7 || importMutation.isPending}
                onClick={() => importMutation.mutate()}
              >
                Import numbers
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={exportCsv} disabled={!entries.length}>
          <Download className="mr-2 size-4" /> Export
        </Button>
      </Card>

      {/* ----------------------------------------------------------------- lists */}
      <Card className="rounded-3xl p-0 shadow-card">
        <Tabs defaultValue="list">
          <div className="border-b border-border/60 px-4 pt-4">
            <TabsList>
              <TabsTrigger value="list">
                <ShieldOff className="mr-1.5 size-4" /> DNC list
                <Badge variant="secondary" className="ml-2">
                  {entries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="audit">
                <History className="mr-1.5 size-4" /> Audit log
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list" className="m-0 p-4">
            {scopeCounts.size ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {[...scopeCounts.entries()].map(([s, n]) => (
                  <Badge key={s} className={cn("border-0 capitalize", DNC_SCOPE_TONE[s])}>
                    {s} · {n}
                  </Badge>
                ))}
              </div>
            ) : null}
            <ScrollArea className="h-[430px] pr-3">
              {center.isLoading ? (
                <p className="py-14 text-center text-sm text-muted-foreground">Loading suppressions…</p>
              ) : entries.length === 0 ? (
                <div className="grid place-items-center gap-2 py-16 text-center">
                  <span className="grid size-12 place-items-center rounded-2xl bg-success/12 text-success">
                    <ShieldCheck className="size-5" />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    Nothing suppressed with these filters. Add a number or import a registry file.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.map((e) => (
                    <div
                      key={e.id}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-surface/40 p-3"
                    >
                      <span
                        className={cn(
                          "grid size-9 place-items-center rounded-full",
                          e.active ? "bg-destructive/12 text-destructive" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {e.active ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium tabular-nums">
                          {formatPhone(e.phone_e164)}{" "}
                          <span className="text-muted-foreground">{e.contact_name ?? ""}</span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {e.reason} · via {e.source} · {when(e.created_at)}
                          {e.notes ? ` · ${e.notes}` : ""}
                        </p>
                      </div>
                      <Badge className={cn("border-0 capitalize", DNC_SCOPE_TONE[e.scope])}>{e.scope}</Badge>
                      {e.active ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={releaseMutation.isPending}
                          onClick={() => releaseMutation.mutate(e.id)}
                        >
                          <RotateCcw className="mr-1 size-4" /> Release
                        </Button>
                      ) : (
                        <Badge variant="secondary">Released {when(e.released_at)}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="audit" className="m-0 p-4">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(["all", ...DNC_ACTIONS] as const).map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant={action === a ? "default" : "outline"}
                  className="rounded-full text-xs"
                  onClick={() => setAction(a)}
                >
                  {a === "all" ? "All actions" : DNC_ACTION_LABEL[a]}
                </Button>
              ))}
            </div>
            <ScrollArea className="h-[430px] pr-3">
              {events.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No compliance activity for this search window.
                </p>
              ) : (
                <div className="space-y-2">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-surface/40 p-3"
                    >
                      <Badge className={cn("border-0", DNC_ACTION_TONE[ev.action])}>
                        {DNC_ACTION_LABEL[ev.action] ?? ev.action}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium tabular-nums">{formatPhone(ev.phone_e164)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ev.reason ?? "—"} · {ev.source}
                          {ev.actor_name ? ` · ${ev.actor_name}` : ""}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{when(ev.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
