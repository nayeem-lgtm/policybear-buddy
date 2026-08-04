import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckSquare,
  Gavel,
  ListChecks,
  PhoneCall,
} from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  callbacks,
  currentUser,
  employees,
  qaReviews,
  tasks,
  type Callback,
  type QAReview,
  type TaskItem,
} from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/my-work")({
  head: () => ({
    meta: [
      { title: "My Work — Policy Bear CRM" },
      {
        name: "description",
        content: "Personal work queue for tasks, callbacks, QA disputes, and approvals.",
      },
      { property: "og:title", content: "My Work — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Personal work queue for tasks, callbacks, QA disputes, and approvals.",
      },
    ],
  }),
  component: MyWorkPage,
});

interface Approval {
  id: string;
  title: string;
  type: string;
  requestedBy: string;
  submittedAt: string;
  priority: TaskItem["priority"];
  status: "Pending" | "Approved" | "Denied";
}

const approvals: Approval[] = Array.from({ length: 9 }, (_, i) => ({
  id: `APR-${400 + i}`,
  title: [
    "Commission adjustment — Marcus Delgado",
    "Time off request — Aug 18-20",
    "Chargeback waiver — POL-7442",
    "Shift swap — Team Bravo",
    "Expense reimbursement — mileage",
    "Schedule change — early start",
    "Refund approval — PB-2026-40061",
    "Overtime request — OEP prep",
    "Bonus adjustment — Q3 spiff",
  ][i]!,
  type: ["Payroll", "Attendance", "Chargeback", "Scheduling", "Expense"][i % 5]!,
  requestedBy: employees[(i + 2) % employees.length]!.name,
  submittedAt: `2026-08-0${(i % 6) + 1}`,
  priority: (["Low", "Normal", "High", "Urgent"] as const)[i % 4]!,
  status: (["Pending", "Approved", "Denied"] as const)[i % 3]!,
}));

const myTasks = tasks.filter((_, i) => i % 2 === 0);
const myCallbacks = callbacks.filter((c) => c.agent === currentUser.name || callbacks.indexOf(c) % 3 === 0).slice(0, 12);
const myDisputes = qaReviews.filter((q) => q.outcome === "Disputed" || qaReviews.indexOf(q) % 4 === 0).slice(0, 10);
const myApprovals = approvals;

function priorityTone(priority: string) {
  return priority === "Urgent" || priority === "High" ? "danger" : priority === "Normal" ? "info" : "muted";
}

function MyWorkPage() {
  const [tab, setTab] = useState("tasks");

  const openTasks = useMemo(() => myTasks.filter((t) => t.status !== "Completed"), []);
  const dueCallbacks = useMemo(
    () => myCallbacks.filter((c) => c.status === "Due" || c.status === "Overdue"),
    [],
  );
  const openDisputes = useMemo(() => myDisputes.filter((d) => d.outcome === "Disputed" || d.outcome === "Pending"), []);
  const pendingApprovals = useMemo(() => myApprovals.filter((a) => a.status === "Pending"), []);

  const taskColumns: Column<TaskItem>[] = [
    { key: "title", header: "Task", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.title}</p>
        <p className="text-xs text-muted-foreground">{r.recordType} · {r.related}</p>
      </div>
    ) },
    { key: "priority", header: "Priority", cell: (r) => <StatusBadge status={r.priority} tone={priorityTone(r.priority)} /> },
    { key: "due", header: "Due", cell: (r) => <span className="tabular">{r.dueDate}</span> },
    { key: "assignedBy", header: "Assigned by", cell: (r) => r.assignedBy },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  const callbackColumns: Column<Callback>[] = [
    { key: "customer", header: "Customer", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.customer}</p>
        <p className="text-xs text-muted-foreground">{r.phone}</p>
      </div>
    ) },
    { key: "scheduledFor", header: "Scheduled", cell: (r) => <span className="tabular">{r.scheduledFor} {r.timeZone}</span> },
    { key: "reason", header: "Reason", cell: (r) => r.reason },
    { key: "priority", header: "Priority", cell: (r) => <StatusBadge status={r.priority} tone={priorityTone(r.priority)} /> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  const disputeColumns: Column<QAReview>[] = [
    { key: "id", header: "Review", cell: (r) => <span className="font-mono text-xs text-foreground">{r.id}</span> },
    { key: "callId", header: "Call", cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.callId}</span> },
    { key: "customer", header: "Customer", cell: (r) => r.customer },
    { key: "reason", header: "Reason", cell: (r) => r.reason },
    { key: "deadline", header: "Deadline", cell: (r) => <span className="tabular">{r.deadline}</span> },
    { key: "outcome", header: "Outcome", cell: (r) => <StatusBadge status={r.outcome} /> },
  ];

  const approvalColumns: Column<Approval>[] = [
    { key: "title", header: "Request", cell: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.title}</p>
        <p className="text-xs text-muted-foreground">{r.type}</p>
      </div>
    ) },
    { key: "requestedBy", header: "Requested by", cell: (r) => r.requestedBy },
    { key: "submittedAt", header: "Submitted", cell: (r) => <span className="tabular">{r.submittedAt}</span> },
    { key: "priority", header: "Priority", cell: (r) => <StatusBadge status={r.priority} tone={priorityTone(r.priority)} /> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="My Work"
        description="Everything assigned to you — tasks, callbacks, QA disputes, and pending approvals in one queue."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open tasks" value={openTasks.length} hint="assigned to you" icon={<CheckSquare className="size-4" />} tone="brand" />
        <StatCard label="Callbacks due" value={dueCallbacks.length} hint="today & overdue" icon={<PhoneCall className="size-4" />} tone="warning" />
        <StatCard label="QA disputes" value={openDisputes.length} hint="need response" icon={<Gavel className="size-4" />} tone="danger" />
        <StatCard label="Pending approvals" value={pendingApprovals.length} hint="awaiting decision" icon={<ListChecks className="size-4" />} tone="info" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tasks" className="gap-1.5">
            Tasks <Badge variant="secondary">{myTasks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="callbacks" className="gap-1.5">
            Callbacks <Badge variant="secondary">{myCallbacks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="disputes" className="gap-1.5">
            QA Disputes <Badge variant="secondary">{myDisputes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5">
            Approvals <Badge variant="secondary">{myApprovals.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <DataTable columns={taskColumns} rows={myTasks} />
        </TabsContent>
        <TabsContent value="callbacks" className="mt-4">
          <DataTable columns={callbackColumns} rows={myCallbacks} />
        </TabsContent>
        <TabsContent value="disputes" className="mt-4">
          <DataTable columns={disputeColumns} rows={myDisputes} empty="No disputes assigned to you." />
        </TabsContent>
        <TabsContent value="approvals" className="mt-4">
          <DataTable columns={approvalColumns} rows={myApprovals} />
        </TabsContent>
      </Tabs>

      {(openTasks.length === 0 && dueCallbacks.length === 0) && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
          <AlertCircle className="size-4" /> Nothing urgent right now — nice work staying on top of the queue.
        </div>
      )}
    </div>
  );
}
