import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckSquare,
  Gavel,
  ListChecks,
  PhoneCall,
  Plus,
} from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskBoard, type GroupBy } from "@/components/tasks/TaskBoard";
import { TaskDetailSheet, TaskFormDialog } from "@/components/tasks/TaskDialog";
import { useAuth } from "@/context/AuthContext";
import { isOverdue, useTaskStore, type TaskDepartment, type WorkTask } from "@/lib/task-store";
import {
  callbacks,
  currentUser,
  employees,
  qaReviews,
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
        content:
          "Personal work queue: owned tasks, delegated work, department board, callbacks, QA disputes, and approvals.",
      },
      { property: "og:title", content: "My Work — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Personal work queue: owned tasks, delegated work, department board, callbacks, QA disputes, and approvals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyWorkPage,
});

const myCallbacks = callbacks
  .filter((c) => c.agent === currentUser.name || callbacks.indexOf(c) % 3 === 0)
  .slice(0, 12);
const myDisputes = qaReviews
  .filter((q) => q.outcome === "Disputed" || qaReviews.indexOf(q) % 4 === 0)
  .slice(0, 10);

function priorityTone(priority: string) {
  return priority === "Urgent" || priority === "High"
    ? "danger"
    : priority === "Normal"
      ? "info"
      : "muted";
}

function MyWorkPage() {
  const { user } = useAuth();
  const me = user?.name ?? currentUser.name;
  const myDepartment = (user?.department ?? "Sales Floor") as TaskDepartment;

  const { tasks, decideApproval, claimTask } = useTaskStore();
  const [tab, setTab] = useState("owned");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkTask | undefined>(undefined);
  const [active, setActive] = useState<WorkTask | null>(null);

  const owned = useMemo(() => tasks.filter((t) => t.owner === me), [tasks, me]);
  const assignedToMe = useMemo(
    () => tasks.filter((t) => t.owner !== me && t.assignees.includes(me)),
    [tasks, me],
  );
  const delegated = useMemo(() => tasks.filter((t) => t.createdBy === me && t.owner !== me), [tasks, me]);
  const deptTasks = useMemo(
    () => tasks.filter((t) => t.department === myDepartment),
    [tasks, myDepartment],
  );
  const unclaimed = useMemo(() => deptTasks.filter((t) => !t.owner), [deptTasks]);
  const myApprovals = useMemo(
    () => tasks.filter((t) => t.requiresApproval && t.approvalStatus !== "None"),
    [tasks],
  );
  const pendingApprovals = myApprovals.filter((a) => a.approvalStatus === "Pending");

  const openTasks = owned.filter((t) => t.status !== "Completed");
  const overdueMine = owned.filter(isOverdue);
  const dueCallbacks = myCallbacks.filter((c) => c.status === "Due" || c.status === "Overdue");
  const openDisputes = myDisputes.filter((d) => d.outcome === "Disputed" || d.outcome === "Pending");

  const callbackColumns: Column<Callback>[] = [
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
      key: "scheduledFor",
      header: "Scheduled",
      cell: (r) => (
        <span className="tabular">
          {r.scheduledFor} {r.timeZone}
        </span>
      ),
    },
    { key: "reason", header: "Reason", cell: (r) => r.reason },
    {
      key: "priority",
      header: "Priority",
      cell: (r) => <StatusBadge status={r.priority} tone={priorityTone(r.priority)} />,
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  const disputeColumns: Column<QAReview>[] = [
    {
      key: "id",
      header: "Review",
      cell: (r) => <span className="font-mono text-xs text-foreground">{r.id}</span>,
    },
    {
      key: "callId",
      header: "Call",
      cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.callId}</span>,
    },
    { key: "customer", header: "Customer", cell: (r) => r.customer },
    { key: "reason", header: "Reason", cell: (r) => r.reason },
    { key: "deadline", header: "Deadline", cell: (r) => <span className="tabular">{r.deadline}</span> },
    { key: "outcome", header: "Outcome", cell: (r) => <StatusBadge status={r.outcome} /> },
  ];

  const priorityHint = (t: TaskItem["priority"]) => priorityTone(t);
  void priorityHint;
  void employees;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="My Work"
        description="Own it, assign it, finish it — tasks you own, work delegated to you, your department board, callbacks, disputes, and approvals."
        actions={
          <>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="h-9 w-auto min-w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Group by: Status</SelectItem>
                <SelectItem value="priority">Group by: Priority</SelectItem>
                <SelectItem value="group">Group by: Timeline</SelectItem>
                <SelectItem value="department">Group by: Department</SelectItem>
                <SelectItem value="owner">Group by: Owner</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-1 size-4" />
              New task
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tasks I own"
          value={openTasks.length}
          hint={`${overdueMine.length} overdue`}
          icon={<CheckSquare className="size-4" />}
          tone="brand"
        />
        <StatCard
          label="Callbacks due"
          value={dueCallbacks.length}
          hint="today & overdue"
          icon={<PhoneCall className="size-4" />}
          tone="warning"
        />
        <StatCard
          label="QA disputes"
          value={openDisputes.length}
          hint="need response"
          icon={<Gavel className="size-4" />}
          tone="danger"
        />
        <StatCard
          label="Pending approvals"
          value={pendingApprovals.length}
          hint="awaiting decision"
          icon={<ListChecks className="size-4" />}
          tone="info"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="owned" className="gap-1.5">
            I own <Badge variant="secondary">{owned.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="assigned" className="gap-1.5">
            Assigned to me <Badge variant="secondary">{assignedToMe.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="delegated" className="gap-1.5">
            I delegated <Badge variant="secondary">{delegated.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="department" className="gap-1.5">
            Department <Badge variant="secondary">{deptTasks.length}</Badge>
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

        <TabsContent value="owned" className="mt-4">
          <TaskBoard
            tasks={owned}
            groupBy={groupBy}
            onOpen={setActive}
            emptyLabel="You don't own any tasks yet — claim one from your department board."
          />
        </TabsContent>

        <TabsContent value="assigned" className="mt-4">
          <TaskBoard
            tasks={assignedToMe}
            groupBy={groupBy}
            onOpen={setActive}
            emptyLabel="Nothing assigned to you by someone else."
          />
        </TabsContent>

        <TabsContent value="delegated" className="mt-4">
          <TaskBoard
            tasks={delegated}
            groupBy={groupBy}
            onOpen={setActive}
            emptyLabel="You haven't delegated any tasks yet."
          />
        </TabsContent>

        <TabsContent value="department" className="mt-4 space-y-3">
          {unclaimed.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <span className="text-foreground">
                {unclaimed.length} unclaimed {myDepartment} task{unclaimed.length > 1 ? "s" : ""} waiting for an owner.
              </span>
              <Button
                size="sm"
                onClick={() => {
                  const next = unclaimed[0];
                  if (next) claimTask(next.id, me);
                }}
              >
                Claim next task
              </Button>
            </div>
          )}
          <TaskBoard
            tasks={deptTasks}
            groupBy={groupBy}
            onOpen={setActive}
            emptyLabel="No tasks on your department board."
          />
        </TabsContent>

        <TabsContent value="callbacks" className="mt-4">
          <DataTable columns={callbackColumns} rows={myCallbacks} />
        </TabsContent>

        <TabsContent value="disputes" className="mt-4">
          <DataTable columns={disputeColumns} rows={myDisputes} empty="No disputes assigned to you." />
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <div className="divide-y divide-border rounded-md border border-border bg-card shadow-card">
            {myApprovals.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">No approval requests right now.</p>
            )}
            {myApprovals.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 p-3.5">
                <button type="button" className="min-w-0 text-left" onClick={() => setActive(a)}>
                  <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.department} · requested by {a.createdBy} · due {a.dueDate}
                  </p>
                </button>
                {a.approvalStatus === "Pending" ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => decideApproval(a.id, "Denied")}>
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => decideApproval(a.id, "Approved")}>
                      Approve
                    </Button>
                  </div>
                ) : (
                  <StatusBadge status={a.approvalStatus} />
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {openTasks.length === 0 && dueCallbacks.length === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
          <AlertCircle className="size-4" /> Nothing urgent right now — nice work staying on top of the queue.
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        currentUser={me}
        defaultDepartment={myDepartment}
        task={editing}
      />
      <TaskDetailSheet
        task={active}
        onOpenChange={(o) => !o && setActive(null)}
        currentUser={me}
        onEdit={(t) => {
          setActive(null);
          setEditing(t);
          setFormOpen(true);
        }}
      />
    </div>
  );
}
