import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PhoneForwarded, AlarmClock, CalendarClock, CheckCircle2, CalendarDays } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { callbacks as callbacksSeed, type Callback } from "@/lib/mock-data";
import { useFilters, unique } from "@/lib/use-filters";

export const Route = createFileRoute("/_shell/callbacks")({
  head: () => ({
    meta: [
      { title: "Callback Queue — Policy Bear CRM" },
      {
        name: "description",
        content: "Priority-ordered callback queue with countdowns, assignment and completion actions.",
      },
      { property: "og:title", content: "Callback Queue — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Priority-ordered callback queue with countdowns, assignment and completion actions.",
      },
    ],
  }),
  component: CallbacksPage,
});

const priorityRank: Record<Callback["priority"], number> = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
const NOW = new Date("2026-08-04T13:00:00");

function dueText(scheduledFor: string, status: Callback["status"]) {
  if (status === "Completed") return "Completed";
  if (status === "Missed") return "Missed";
  const target = new Date(scheduledFor.replace(" ", "T") + ":00");
  const diffMin = Math.round((target.getTime() - NOW.getTime()) / 60000);
  if (Number.isNaN(diffMin)) return scheduledFor;
  if (diffMin < 0) return `Overdue by ${Math.abs(diffMin)}m`;
  if (diffMin === 0) return "Due now";
  if (diffMin < 60) return `Due in ${diffMin}m`;
  return `Due in ${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
}

function CallbacksPage() {
  const [rows, setRows] = useState<Callback[]>(callbacksSeed);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(rows, {
    searchFields: (r) => [r.customer, r.phone, r.agent, r.id],
    filters: {
      agent: (r) => r.agent,
      priority: (r) => r.priority,
      status: (r) => r.status,
    },
  });

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (a.status !== b.status) {
          const order = { Overdue: 0, Due: 1, Scheduled: 2, Missed: 3, Completed: 4 };
          return order[a.status] - order[b.status];
        }
        return priorityRank[a.priority] - priorityRank[b.priority];
      }),
    [filtered],
  );

  const stats = useMemo(() => {
    const due = rows.filter((r) => r.status === "Due").length;
    const overdue = rows.filter((r) => r.status === "Overdue").length;
    const urgent = rows.filter((r) => r.priority === "Urgent" && r.status !== "Completed").length;
    const completedToday = rows.filter((r) => r.status === "Completed").length;
    return { due, overdue, urgent, completedToday };
  }, [rows]);

  const updateRow = (id: string, patch: Partial<Callback>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const columns: Column<Callback>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.customer}</p>
          <p className="text-xs text-muted-foreground">{r.phone}</p>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      cell: (r) => <StatusBadge status={r.priority} />,
    },
    { key: "reason", header: "Reason", cell: (r) => r.reason },
    { key: "scheduledFor", header: "Scheduled", cell: (r) => `${r.scheduledFor} ${r.timeZone}` },
    {
      key: "due",
      header: "Due",
      cell: (r) => (
        <span
          className={
            r.status === "Overdue"
              ? "font-medium text-destructive"
              : r.status === "Due"
                ? "font-medium text-brand"
                : "text-muted-foreground"
          }
        >
          {dueText(r.scheduledFor, r.status)}
        </span>
      ),
    },
    {
      key: "agent",
      header: "Assigned Agent",
      cell: (r) => (
        <Select value={r.agent} onValueChange={(v) => updateRow(r.id, { agent: v })}>
          <SelectTrigger className="h-8 w-40" onClick={(e) => e.stopPropagation()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent onClick={(e) => e.stopPropagation()}>
            {unique(callbacksSeed, (c) => c.agent).map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="secondary"
            disabled={r.status === "Completed"}
            onClick={() => {
              updateRow(r.id, { status: "Completed" });
              toast.success(`Callback with ${r.customer} marked complete`);
            }}
          >
            Complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={r.status === "Completed"}
            onClick={() => {
              updateRow(r.id, { status: "Scheduled" });
              toast.info(`Callback with ${r.customer} rescheduled`);
            }}
          >
            Reschedule
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Callback Queue"
        description="Priority-ordered follow-ups with live due-time countdowns."
        actions={
          <Button variant="outline" asChild>
            <Link to="/callbacks/calendar" className="flex items-center gap-1.5">
              <CalendarDays className="size-4" /> Calendar view
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Due Now" value={stats.due} icon={<AlarmClock className="size-4" />} tone="brand" />
        <StatCard label="Overdue" value={stats.overdue} icon={<PhoneForwarded className="size-4" />} tone="danger" />
        <StatCard label="Urgent Priority" value={stats.urgent} icon={<CalendarClock className="size-4" />} tone="warning" />
        <StatCard label="Completed Today" value={stats.completedToday} icon={<CheckCircle2 className="size-4" />} tone="success" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search callbacks by customer, phone or agent…"
        filters={[
          { key: "agent", label: "Agent", options: unique(callbacksSeed, (r) => r.agent) },
          { key: "priority", label: "Priority", options: unique(callbacksSeed, (r) => r.priority) },
          { key: "status", label: "Status", options: unique(callbacksSeed, (r) => r.status) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={sorted} footer={`${sorted.length} of ${rows.length} callbacks`} />
    </div>
  );
}
