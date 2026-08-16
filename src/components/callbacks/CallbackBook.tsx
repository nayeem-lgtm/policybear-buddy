/**
 * The Callback Book — queue and calendar merged into one premium workspace.
 *
 * Reads the live callback table (booked from the agent desk, wrap-up screen or
 * this page) and lets an agent work it end to end: call now, complete,
 * reschedule, reassign or cancel — from a priority queue or a week/day calendar.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Plus,
  PhoneCall,
  RefreshCw,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { CallbackDialog } from "@/components/callbacks/CallbackDialog";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "@/integrations/supabase/types";
import { CALLBACK_STATUSES, CALLBACK_STATUS_TONE, type CallbackStatus } from "@/lib/dialer-shared";
import { getCallbackBook, startCall, updateCallback } from "@/lib/dialer.functions";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

type CallbackRow = Database["public"]["Tables"]["callbacks"]["Row"];

const OPEN_STATUSES: readonly string[] = ["Pending", "Scheduled", "Calling", "No Answer", "Busy", "Failed"];
const HOURS = Array.from({ length: 14 }, (_, i) => 7 + i); // 07:00 → 20:00

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = (out.getDay() + 6) % 7; // monday-first
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function dueLabel(row: CallbackRow, now: Date): string {
  if (row.status === "Completed") return "Completed";
  if (row.status === "Cancelled") return "Cancelled";
  if (!row.scheduled_at) return "Unscheduled";
  const diff = Math.round((new Date(row.scheduled_at).getTime() - now.getTime()) / 60000);
  if (diff < -60) return `Overdue ${Math.floor(Math.abs(diff) / 60)}h ${Math.abs(diff) % 60}m`;
  if (diff < 0) return `Overdue ${Math.abs(diff)}m`;
  if (diff === 0) return "Due now";
  if (diff < 60) return `Due in ${diff}m`;
  if (diff < 60 * 24) return `Due in ${Math.floor(diff / 60)}h ${diff % 60}m`;
  return `Due in ${Math.round(diff / 60 / 24)}d`;
}

function isOverdue(row: CallbackRow, now: Date): boolean {
  return (
    OPEN_STATUSES.includes(row.status) &&
    Boolean(row.scheduled_at) &&
    new Date(row.scheduled_at as string).getTime() < now.getTime()
  );
}

function timeText(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function CallbackBook({ initialView = "queue" }: { initialView?: "queue" | "calendar" }) {
  const queryClient = useQueryClient();
  const load = useServerFn(getCallbackBook);
  const patch = useServerFn(updateCallback);
  const dial = useServerFn(startCall);

  const { data, isPending } = useQuery({
    queryKey: ["callback-book"],
    queryFn: () => load({}),
    refetchInterval: 20_000,
  });

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const [view, setView] = useState<"queue" | "calendar">(initialView);
  const [calMode, setCalMode] = useState<"week" | "day">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");
  const [agent, setAgent] = useState("all");
  const [booking, setBooking] = useState(false);
  const [reschedule, setReschedule] = useState<CallbackRow | null>(null);
  const [selected, setSelected] = useState<CallbackRow | null>(null);

  const rows = (data?.callbacks ?? []) as CallbackRow[];
  const agents = data?.agents ?? [];
  const me = data?.userId ?? "";

  const agentName = (id: string | null) =>
    agents.find((a) => a.id === id)?.name ?? (id ? "Assigned" : "Unassigned");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "open" ? !OPEN_STATUSES.includes(r.status) : status !== "all" && r.status !== status)
        return false;
      if (agent === "mine" ? r.assigned_to !== me : agent === "unassigned" ? r.assigned_to : false)
        return false;
      if (agent !== "all" && agent !== "mine" && agent !== "unassigned" && r.assigned_to !== agent)
        return false;
      if (!q) return true;
      return [r.contact_name, r.phone_e164, r.reason, r.detail]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, status, agent, me]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const ao = isOverdue(a, now) ? 0 : 1;
        const bo = isOverdue(b, now) ? 0 : 1;
        if (ao !== bo) return ao - bo;
        const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
        const bt = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
        return at - bt;
      }),
    [filtered, now],
  );

  const stats = useMemo(() => {
    const open = rows.filter((r) => OPEN_STATUSES.includes(r.status));
    return {
      open: open.length,
      overdue: open.filter((r) => isOverdue(r, now)).length,
      today: open.filter((r) => r.scheduled_at && sameDay(new Date(r.scheduled_at), now)).length,
      mine: open.filter((r) => r.assigned_to === me).length,
      completed: rows.filter(
        (r) => r.status === "Completed" && sameDay(new Date(r.updated_at ?? r.created_at), now),
      ).length,
    };
  }, [rows, now, me]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["callback-book"] });
    void queryClient.invalidateQueries({ queryKey: ["dialer-desk"] });
  };

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status?: CallbackStatus; assignToMe?: boolean }) =>
      patch({ data: input }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const dialMutation = useMutation({
    mutationFn: (row: CallbackRow) =>
      dial({
        data: {
          phone: row.phone_e164,
          contactName: row.contact_name ?? undefined,
          contactId: row.contact_id ?? undefined,
          callbackId: row.id,
          mode: "manual" as const,
        },
      }),
    onSuccess: (_r, row) => {
      toast.success(`Calling ${row.contact_name ?? formatPhone(row.phone_e164)} — open the agent desk`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* --------------------------------------------------------------- calendar data */
  const weekStart = startOfWeek(anchor);
  const calDays = calMode === "week"
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      })
    : [new Date(anchor)];

  const unscheduled = filtered.filter((r) => !r.scheduled_at);

  const shift = (dir: 1 | -1) => {
    const next = new Date(anchor);
    next.setDate(next.getDate() + dir * (calMode === "week" ? 7 : 1));
    setAnchor(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Callback Book"
        description="Queue and calendar in one place — every follow-up booked from the dialer lands here with a live countdown."
        actions={
          <>
            <Button variant="outline" onClick={() => invalidate()}>
              <RefreshCw className={cn("mr-2 size-4", isPending && "animate-spin")} /> Refresh
            </Button>
            <Button onClick={() => setBooking(true)}>
              <Plus className="mr-2 size-4" /> Set callback
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Open" value={stats.open} icon={<ListChecks className="size-4" />} tone="brand" />
        <StatCard label="Overdue" value={stats.overdue} icon={<AlarmClock className="size-4" />} tone="danger" />
        <StatCard label="Due today" value={stats.today} icon={<Clock className="size-4" />} tone="warning" />
        <StatCard label="Assigned to me" value={stats.mine} icon={<UserPlus className="size-4" />} tone="info" />
        <StatCard label="Completed today" value={stats.completed} icon={<CheckCircle2 className="size-4" />} tone="success" />
      </div>

      <Card className="gap-0 rounded-3xl p-0 shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-4">
          <Tabs value={view} onValueChange={(v) => setView(v as "queue" | "calendar")}>
            <TabsList>
              <TabsTrigger value="queue">
                <ListChecks className="mr-1.5 size-4" /> Queue
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarDays className="mr-1.5 size-4" /> Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, number or reason…"
            className="h-9 w-full sm:w-64"
          />

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open only</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
              {CALLBACK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={agent} onValueChange={setAgent}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              <SelectItem value="mine">Assigned to me</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {view === "calendar" && (
            <div className="ml-auto flex items-center gap-1.5">
              <Tabs value={calMode} onValueChange={(v) => setCalMode(v as "week" | "day")}>
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="day">Day</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- queue view */}
        {view === "queue" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface/70 text-[0.68rem] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-3 py-3 text-left">Urgency</th>
                  <th className="px-3 py-3 text-left">Reason</th>
                  <th className="px-3 py-3 text-left">Scheduled</th>
                  <th className="px-3 py-3 text-left">Due</th>
                  <th className="px-3 py-3 text-left">Assigned agent</th>
                  <th className="px-3 py-3 text-left">Source</th>
                  <th className="px-3 py-3 text-center">Attempts</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-sm text-muted-foreground">
                      {isPending ? "Loading the callback book…" : "No callbacks match these filters."}
                    </td>
                  </tr>
                ) : (
                  sorted.map((r) => {
                    const overdue = isOverdue(r, now);
                    const urgency = urgencyOf(r, now);
                    return (
                      <tr
                        key={r.id}
                        className={cn(
                          "group transition-colors hover:bg-accent/40",
                          overdue && "bg-destructive/[0.035]",
                        )}
                      >
                        <td className="px-4 py-3">
                          <button className="flex items-center gap-3 text-left" onClick={() => setSelected(r)}>
                            <span
                              className={cn(
                                "grid size-9 shrink-0 place-items-center rounded-xl text-[0.7rem] font-semibold",
                                overdue ? "bg-destructive/12 text-destructive" : "bg-brand/10 text-brand",
                              )}
                            >
                              {initialsOf(r)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-foreground group-hover:text-brand">
                                {r.contact_name || formatPhone(r.phone_e164)}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {formatPhone(r.phone_e164)}
                              </span>
                            </span>
                          </button>
                        </td>

                        <td className="px-3 py-3">
                          <Badge variant="secondary" className={cn("rounded-full", URGENCY_TONE[urgency])}>
                            {urgency}
                          </Badge>
                        </td>

                        <td className="max-w-[15rem] px-3 py-3">
                          <span className="block truncate font-medium text-foreground">{r.reason}</span>
                          {r.detail || r.notes ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {r.detail || r.notes}
                            </span>
                          ) : null}
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap">
                          {r.scheduled_at ? (
                            <>
                              <span className="block text-foreground">
                                {new Date(r.scheduled_at).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}{" "}
                                {timeText(r.scheduled_at)}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                Booked {new Date(r.requested_at).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Unscheduled</span>
                          )}
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "font-medium",
                              overdue
                                ? "text-destructive"
                                : urgency === "High"
                                  ? "text-brand"
                                  : "text-muted-foreground",
                            )}
                          >
                            {dueLabel(r, now)}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <Select
                            value={r.assigned_to ?? "unassigned"}
                            onValueChange={(v) =>
                              statusMutation.mutate({
                                id: r.id,
                                assignTo: v === "unassigned" ? null : v,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 w-40">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {agents.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap">
                          <Badge variant="outline" className="rounded-full text-xs capitalize">
                            {r.source}
                          </Badge>
                        </td>

                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className="font-medium tabular-nums">{r.attempts}</span>
                          {r.last_attempt_at ? (
                            <span className="block text-xs text-muted-foreground">
                              last {timeText(r.last_attempt_at)}
                            </span>
                          ) : null}
                        </td>

                        <td className="px-3 py-3">
                          <Badge
                            variant="secondary"
                            className={cn("rounded-full", CALLBACK_STATUS_TONE[r.status as CallbackStatus])}
                          >
                            {r.status}
                          </Badge>
                          {r.outcome ? (
                            <span className="mt-1 block text-xs text-muted-foreground">{r.outcome}</span>
                          ) : null}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              disabled={dialMutation.isPending}
                              onClick={() => dialMutation.mutate(r)}
                            >
                              <PhoneCall className="mr-1.5 size-3.5" /> Call
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setReschedule(r)}>
                              <CalendarDays className="mr-1.5 size-3.5" /> Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => statusMutation.mutate({ id: r.id, status: "Completed" })}
                            >
                              <CheckCircle2 className="mr-1.5 size-3.5" /> Done
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {sorted.length ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
                <span>
                  Showing {sorted.length} of {rows.length} callbacks
                </span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-destructive" /> Overdue
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-brand" /> Due soon
                  </span>
                  <span>Click a customer for the full callback record</span>
                </span>
              </div>
            ) : null}
          </div>
        ) : (

          /* ---------------------------------------------------------- calendar view */
          <div className="space-y-4 p-4">
            <div className="overflow-x-auto rounded-2xl border border-border">
              <div
                className="grid min-w-[760px]"
                style={{ gridTemplateColumns: `4.5rem repeat(${calDays.length}, minmax(0,1fr))` }}
              >
                <div className="border-b border-border bg-surface/70 p-2" />
                {calDays.map((d) => (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      "border-b border-l border-border bg-surface/70 p-2 text-center text-xs font-semibold tracking-wide uppercase",
                      sameDay(d, now) ? "text-brand" : "text-muted-foreground",
                    )}
                  >
                    {d.toLocaleDateString([], { weekday: "short", day: "numeric" })}
                  </div>
                ))}

                {HOURS.map((hour) => (
                  <div key={hour} className="col-span-full grid grid-cols-subgrid">
                    <div className="border-b border-border p-2 text-right text-xs text-muted-foreground">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    {calDays.map((d) => {
                      const slot = filtered.filter((r) => {
                        if (!r.scheduled_at) return false;
                        const at = new Date(r.scheduled_at);
                        return sameDay(at, d) && at.getHours() === hour;
                      });
                      return (
                        <div
                          key={`${d.toISOString()}-${hour}`}
                          className="min-h-[3.25rem] space-y-1 border-b border-l border-border p-1"
                        >
                          {slot.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => setSelected(r)}
                              className={cn(
                                "block w-full rounded-lg border px-1.5 py-1 text-left text-[0.7rem] leading-tight transition-colors",
                                isOverdue(r, now)
                                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                                  : "border-brand/35 bg-brand/10 text-brand hover:bg-brand/20",
                              )}
                            >
                              <span className="block truncate font-medium">
                                {timeText(r.scheduled_at)} · {r.contact_name || formatPhone(r.phone_e164)}
                              </span>
                              <span className="block truncate opacity-80">{r.reason}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {unscheduled.length ? (
              <div className="rounded-2xl border border-dashed border-border p-3">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Unscheduled ({unscheduled.length}) — drop them on the calendar
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {unscheduled.map((r) => (
                    <Button
                      key={r.id}
                      size="sm"
                      variant="secondary"
                      className="rounded-full text-xs"
                      onClick={() => setReschedule(r)}
                    >
                      {r.contact_name || formatPhone(r.phone_e164)}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------- detail sheet */}
      <Sheet open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.contact_name || formatPhone(selected.phone_e164)}</SheetTitle>
                <SheetDescription>
                  {formatPhone(selected.phone_e164)} · {dueLabel(selected, now)}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4 pb-6 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(CALLBACK_STATUS_TONE[selected.status as CallbackStatus])}
                  >
                    {selected.status}
                  </Badge>
                  <Badge variant="outline">{selected.source}</Badge>
                  <Badge variant="outline">Attempts {selected.attempts}</Badge>
                </div>

                <dl className="space-y-2">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Reason</dt>
                    <dd className="text-right font-medium">{selected.reason}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Scheduled</dt>
                    <dd className="text-right font-medium">
                      {selected.scheduled_at
                        ? new Date(selected.scheduled_at).toLocaleString()
                        : "Unscheduled"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Owner</dt>
                    <dd className="text-right font-medium">{agentName(selected.assigned_to)}</dd>
                  </div>
                </dl>

                {selected.detail || selected.notes ? (
                  <p className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                    {selected.detail || selected.notes}
                  </p>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button onClick={() => dialMutation.mutate(selected)}>
                    <PhoneCall className="mr-1.5 size-4" /> Call now
                  </Button>
                  <Button variant="outline" onClick={() => setReschedule(selected)}>
                    <CalendarDays className="mr-1.5 size-4" /> Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => statusMutation.mutate({ id: selected.id, assignToMe: true })}
                  >
                    <UserPlus className="mr-1.5 size-4" /> Assign to me
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      statusMutation.mutate({ id: selected.id, status: "Completed" });
                      setSelected(null);
                    }}
                  >
                    <CheckCircle2 className="mr-1.5 size-4" /> Complete
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive sm:col-span-2"
                    onClick={() => {
                      statusMutation.mutate({ id: selected.id, status: "Cancelled" });
                      setSelected(null);
                    }}
                  >
                    <X className="mr-1.5 size-4" /> Cancel callback
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <CallbackDialog open={booking} onOpenChange={setBooking} />
      <CallbackDialog
        open={Boolean(reschedule)}
        onOpenChange={(o) => !o && setReschedule(null)}
        callbackId={reschedule?.id ?? null}
        phone={reschedule?.phone_e164 ?? null}
        contactName={reschedule?.contact_name ?? null}
        onSaved={() => setReschedule(null)}
      />
    </div>
  );
}
