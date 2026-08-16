import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, CheckCircle2, Clock, Plane, Umbrella, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { DataTable } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import {
  decideLeaveRequest,
  getMyLeaveRequests,
  submitLeaveRequest,
} from "@/lib/leave.functions";
import {
  LEAVE_TYPES,
  coversDate,
  formatDateRange,
  leaveTone,
  type LeaveType,
} from "@/lib/leave-shared";
import { pacificDate } from "@/lib/shift-shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/leave")({
  head: () => ({
    meta: [
      { title: "My Leave — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Apply for PTO or unpaid leave, track approval status and see your upcoming time off.",
      },
      { property: "og:title", content: "My Leave — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Request PTO or unpaid time off and follow every approval in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeavePage;
});

function LeavePage() {
  const qc = useQueryClient();
  const load = useServerFn(getMyLeaveRequests);
  const submit = useServerFn(submitLeaveRequest);
  const decide = useServerFn(decideLeaveRequest);

  const query = useQuery({ queryKey: ["my-leave"], queryFn: () => load() });
  const rows = query.data ?? [];
  const today = pacificDate();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LeaveType>("PTO");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [reason, setReason] = useState("");

  const dayCount = useMemo(() => {
    const s = new Date(`${start}T00:00:00Z`).valueOf();
    const e = new Date(`${end}T00:00:00Z`).valueOf();
    if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0;
    return Math.round((e - s) / 86_400_000) + 1;
  }, [start, end]);

  const create = useMutation({
    mutationFn: () =>
      submit({ data: { leave_type: type, start_date: start, end_date: end, reason } }),
    onSuccess: () => {
      toast.success("Leave request submitted for approval.");
      setOpen(false);
      setReason("");
      void qc.invalidateQueries({ queryKey: ["my-leave"] });
      void qc.invalidateQueries({ queryKey: ["leave-range"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => decide({ data: { id, status: "Cancelled" } }),
    onSuccess: () => {
      toast.success("Request cancelled.");
      void qc.invalidateQueries({ queryKey: ["my-leave"] });
      void qc.invalidateQueries({ queryKey: ["leave-range"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = rows.filter((r) => r.status === "Pending");
  const approved = rows.filter((r) => r.status === "Approved");
  const ptoDays = approved
    .filter((r) => r.leave_type === "PTO")
    .reduce((s, r) => s + Number(r.days), 0);
  const unpaidDays = approved
    .filter((r) => r.leave_type === "Unpaid")
    .reduce((s, r) => s + Number(r.days), 0);
  const onLeaveToday = approved.some((r) => coversDate(r, today));
  const upcoming = approved
    .filter((r) => r.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="brand-gradient relative gap-0 overflow-hidden rounded-3xl border-0 p-0 text-brand-foreground shadow-raised">
        <div className="brand-mesh absolute inset-0 opacity-90" aria-hidden />
        <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-brand-foreground/60 uppercase">
              My leave
            </p>
            <h1 className="font-display text-2xl font-semibold">Time off, simply requested</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabular rounded-full bg-brand-foreground/12 px-2.5 py-1 text-xs font-medium text-brand-foreground/85">
                {pending.length} awaiting approval
              </span>
              <span className="tabular rounded-full bg-brand-foreground/12 px-2.5 py-1 text-xs font-medium text-brand-foreground/85">
                {approved.length} approved
              </span>
              {onLeaveToday && (
                <span className="rounded-full bg-success/25 px-2.5 py-1 text-xs font-semibold text-brand-foreground">
                  You are on leave today
                </span>
              )}
            </div>
            <p className="max-w-lg text-sm text-brand-foreground/70">
              Choose PTO or unpaid leave, pick your dates and send it for approval. Approved leave
              shows on the team attendance board automatically.
            </p>
          </div>

          <Button
            size="lg"
            className="rounded-xl bg-brand-foreground text-brand hover:bg-brand-foreground/90"
            onClick={() => setOpen(true)}
          >
            <CalendarDays className="size-4" /> Apply for leave
          </Button>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Pending approval",
            value: pending.length,
            hint: "Waiting on your manager",
            icon: <Clock className="size-4" />,
            accent: "bg-warning/25 text-brand-tan",
          },
          {
            label: "PTO days taken",
            value: ptoDays,
            hint: "Approved paid time off",
            icon: <Umbrella className="size-4" />,
            accent: "bg-brand/10 text-brand",
          },
          {
            label: "Unpaid days",
            value: unpaidDays,
            hint: "Approved unpaid leave",
            icon: <Wallet className="size-4" />,
            accent: "bg-brand-cyan/25 text-brand-teal",
          },
          {
            label: "Upcoming leave",
            value: upcoming.length,
            hint: upcoming[0] ? `Next ${upcoming[0].start_date}` : "Nothing booked",
            icon: <Plane className="size-4" />,
            accent: "bg-success/15 text-success",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-4"
          >
            <span
              className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", m.accent)}
            >
              {m.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                {m.label}
              </p>
              <p className="tabular font-display text-lg font-semibold text-foreground">{m.value}</p>
              <p className="truncate text-xs text-muted-foreground">{m.hint}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Requests */}
      <Card className="gap-0 overflow-hidden rounded-3xl p-0 shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-surface/50 p-4">
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">My requests</h2>
            <p className="text-xs text-muted-foreground">
              Every request you have submitted, newest first.
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => setOpen(true)}>
            <CalendarDays className="size-4" /> New request
          </Button>
        </div>

        <DataTable
          className="rounded-none border-0 shadow-none"
          columns={[
            {
              key: "type",
              header: "Type",
              cell: (r) => (
                <StatusBadge
                  status={r.leave_type}
                  tone={r.leave_type === "PTO" ? "brand" : "info"}
                />
              ),
            },
            {
              key: "dates",
              header: "Dates",
              cell: (r) => (
                <span className="tabular">{formatDateRange(r.start_date, r.end_date)}</span>
              ),
            },
            {
              key: "days",
              header: "Days",
              align: "right",
              cell: (r) => <span className="tabular">{Number(r.days)}</span>,
            },
            {
              key: "reason",
              header: "Reason",
              cell: (r) => (
                <span className="text-sm text-muted-foreground">{r.reason || "—"}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => <StatusBadge status={r.status} tone={leaveTone(r.status)} />,
            },
            {
              key: "actions",
              header: "",
              align: "right",
              cell: (r) =>
                r.status === "Pending" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => cancel.mutate(r.id)}
                  >
                    Cancel
                  </Button>
                ) : r.reviewed_at ? (
                  <span className="text-xs text-muted-foreground">
                    Reviewed {r.reviewed_at.slice(0, 10)}
                  </span>
                ) : null,
            },
          ]}
          rows={rows}
          empty={
            query.isLoading
              ? "Loading your leave requests…"
              : "No leave requests yet — apply for PTO or unpaid leave to get started."
          }
        />
      </Card>

      {/* Apply dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for leave</DialogTitle>
            <DialogDescription>
              Pick the leave type and dates. Your manager will see it as a pending approval.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Leave type</Label>
              <div className="grid grid-cols-2 gap-2">
                {LEAVE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      type === t
                        ? "border-brand bg-brand/5"
                        : "border-border/60 hover:border-brand/40",
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{t}</p>
                    <p className="text-xs text-muted-foreground">
                      {t === "PTO" ? "Paid time off" : "Time off without pay"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="leave-start">Start date</Label>
                <Input
                  id="leave-start"
                  type="date"
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    if (end < e.target.value) setEnd(e.target.value);
                  }}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="leave-end">End date</Label>
                <Input
                  id="leave-end"
                  type="date"
                  min={start}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="leave-reason">Reason (optional)</Label>
              <Textarea
                id="leave-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Family trip, medical appointment…"
                rows={3}
              />
            </div>

            <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {dayCount > 0
                ? `${dayCount} day${dayCount > 1 ? "s" : ""} of ${type} leave requested.`
                : "Select a valid date range."}
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={dayCount === 0 || create.isPending}
              onClick={() => create.mutate()}
            >
              <CheckCircle2 className="size-4" /> Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
