import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ClipboardList, X } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tasks, type TaskItem } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks & Approvals — Policy Bear CRM" },
      {
        name: "description",
        content: "Kanban task board and pending approval requests across the operations floor.",
      },
      { property: "og:title", content: "Tasks & Approvals — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Kanban task board and pending approval requests across the operations floor.",
      },
    ],
  }),
  component: TasksApprovalsPage,
});

const columns: { key: TaskItem["status"]; label: string }[] = [
  { key: "Not Started", label: "To do" },
  { key: "In Progress", label: "In progress" },
  { key: "Waiting", label: "Waiting" },
  { key: "Completed", label: "Done" },
];

interface Approval {
  id: string;
  title: string;
  requestedBy: string;
  type: string;
  amount?: string;
  submittedAt: string;
  status: "Pending" | "Approved" | "Denied";
}

function TasksApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([
    { id: "APR-1", title: "Commission adjustment — POL-7412", requestedBy: "Nadia Bloom", type: "Commission", amount: "$185.00", submittedAt: "2026-08-04 08:12", status: "Pending" },
    { id: "APR-2", title: "Attendance exception waiver", requestedBy: "Dana Reyes", type: "Attendance", submittedAt: "2026-08-04 07:40", status: "Pending" },
    { id: "APR-3", title: "Chargeback write-off — POL-7440", requestedBy: "Nadia Bloom", type: "Chargeback", amount: "$620.00", submittedAt: "2026-08-03 16:05", status: "Pending" },
    { id: "APR-4", title: "QA dispute overturn — CT-480091", requestedBy: "Leo Whitaker", type: "QA", submittedAt: "2026-08-03 14:22", status: "Pending" },
    { id: "APR-5", title: "Overtime approval — Team Charlie", requestedBy: "Marcus Hale", type: "Payroll", amount: "$412.00", submittedAt: "2026-08-02 18:10", status: "Approved" },
  ]);

  const grouped = useMemo(() => {
    const map: Record<TaskItem["status"], TaskItem[]> = {
      "Not Started": [],
      "In Progress": [],
      Waiting: [],
      Completed: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, []);

  const pending = approvals.filter((a) => a.status === "Pending");

  function decide(id: string, status: "Approved" | "Denied") {
    setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control"
        title="Tasks & Approvals"
        description="Kanban task board plus pending approval requests requiring sign-off."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open tasks" value={tasks.filter((t) => t.status !== "Completed").length} tone="brand" icon={<ClipboardList className="size-4" />} />
        <StatCard label="Urgent tasks" value={tasks.filter((t) => t.priority === "Urgent").length} tone="danger" />
        <StatCard label="Pending approvals" value={pending.length} tone="warning" />
        <StatCard label="Completed today" value={grouped.Completed.length} tone="success" />
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {columns.map((col) => (
          <div key={col.key} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-foreground">{col.label}</p>
              <Badge variant="secondary">{grouped[col.key].length}</Badge>
            </div>
            <div className="space-y-2">
              {grouped[col.key].map((t) => (
                <Card key={t.id} className="gap-1.5 p-3 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <StatusBadge status={t.priority} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.recordType} · {t.related}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Due {t.dueDate}</span>
                    <span>{t.assignedBy}</span>
                  </div>
                </Card>
              ))}
              {grouped[col.key].length === 0 && (
                <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  Nothing here
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Approval requests</p>
        <Card className="divide-y divide-border p-0 shadow-card">
          {approvals.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.requestedBy} · {a.type} {a.amount ? `· ${a.amount}` : ""} · {a.submittedAt}
                </p>
              </div>
              {a.status === "Pending" ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => decide(a.id, "Denied")}>
                    <X className="mr-1 size-3.5" />
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => decide(a.id, "Approved")}>
                    <Check className="mr-1 size-3.5" />
                    Approve
                  </Button>
                </div>
              ) : (
                <StatusBadge status={a.status} />
              )}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
