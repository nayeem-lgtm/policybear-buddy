import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, LayoutGrid, Plus, RotateCcw } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { FilterBar } from "@/components/crm/FilterBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  TASK_DEPARTMENTS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  isOverdue,
  useTaskStore,
  type TaskDepartment,
  type WorkTask,
} from "@/lib/task-store";

export const Route = createFileRoute("/_shell/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks & Approvals — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Departmental task boards with ownership, assignment, inline status updates, and approval sign-off.",
      },
      { property: "og:title", content: "Tasks & Approvals — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Departmental task boards with ownership, assignment, inline status updates, and approval sign-off.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TasksApprovalsPage,
});

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "group", label: "Group by: Timeline" },
  { value: "status", label: "Group by: Status" },
  { value: "department", label: "Group by: Department" },
  { value: "owner", label: "Group by: Owner" },
  { value: "priority", label: "Group by: Priority" },
];

function TasksApprovalsPage() {
  const { user } = useAuth();
  const me = user?.name ?? "Amelia Carter";
  const myDepartment = (user?.department ?? "Operations") as TaskDepartment;

  const { tasks, decideApproval, resetBoard, claimTask } = useTaskStore();

  const [search, setSearch] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [groupBy, setGroupBy] = useState<GroupBy>("group");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkTask | undefined>(undefined);
  const [active, setActive] = useState<WorkTask | null>(null);
  const [scope, setScope] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (scope === "department" && t.department !== myDepartment) return false;
      if (scope === "mine" && t.owner !== me && !t.assignees.includes(me)) return false;
      if (scope === "unassigned" && t.owner) return false;
      const fDept = values["department"];
      const fStatus = values["status"];
      const fPriority = values["priority"];
      const fOwner = values["owner"];
      const fDue = values["due"];
      if (fDept && fDept !== "all" && t.department !== fDept) return false;
      if (fStatus && fStatus !== "all" && t.status !== fStatus) return false;
      if (fPriority && fPriority !== "all" && t.priority !== fPriority) return false;
      if (fOwner && fOwner !== "all") {
        if (fOwner === "Unassigned" ? !!t.owner : t.owner !== fOwner) return false;
      }
      if (fDue && fDue !== "all") {
        if (fDue === "Overdue" && !isOverdue(t)) return false;
        if (fDue === "Open" && t.status === "Completed") return false;
        if (fDue === "Completed" && t.status !== "Completed") return false;
      }
      if (q && !`${t.title} ${t.id} ${t.related} ${t.tags.join(" ")} ${t.owner ?? ""}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [tasks, search, values, scope, me, myDepartment]);

  const owners = useMemo(
    () => ["Unassigned", ...Array.from(new Set(tasks.map((t) => t.owner).filter(Boolean) as string[])).sort()],
    [tasks],
  );

  const approvals = tasks.filter((t) => t.requiresApproval && t.approvalStatus !== "None");
  const pendingApprovals = approvals.filter((t) => t.approvalStatus === "Pending");
  const open = tasks.filter((t) => t.status !== "Completed");
  const overdue = tasks.filter(isOverdue);
  const unowned = tasks.filter((t) => !t.owner);

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control"
        title="Tasks & Approvals"
        description="Departmental boards with real ownership, assignment, inline updates, and approval sign-off."
        actions={
          <>
            <Button variant="outline" onClick={resetBoard}>
              <RotateCcw className="mr-1 size-4" />
              Reset board
            </Button>
            <Button onClick={openNew}>
              <Plus className="mr-1 size-4" />
              New task
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open tasks" value={open.length} tone="brand" icon={<ClipboardList className="size-4" />} />
        <StatCard label="Overdue" value={overdue.length} tone="danger" hint="past due date" />
        <StatCard label="Unassigned" value={unowned.length} tone="warning" hint="need an owner" />
        <StatCard label="Pending approvals" value={pendingApprovals.length} tone="info" />
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board" className="gap-1.5">
            <LayoutGrid className="size-3.5" /> Board <Badge variant="secondary">{filtered.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5">Departments</TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5">
            Approvals <Badge variant="secondary">{pendingApprovals.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search tasks, owners, records…"
            filters={[
              { key: "department", label: "Departments", options: [...TASK_DEPARTMENTS] },
              { key: "status", label: "Statuses", options: [...TASK_STATUSES] },
              { key: "priority", label: "Priorities", options: [...TASK_PRIORITIES] },
              { key: "owner", label: "Owners", options: owners },
              { key: "due", label: "Timing", options: ["Overdue", "Open", "Completed"] },
            ]}
            values={values}
            onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
            onReset={() => {
              setValues({});
              setSearch("");
              setScope("all");
            }}
            trailing={
              <>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger className="h-9 w-auto min-w-[9.5rem]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tasks</SelectItem>
                    <SelectItem value="mine">My tasks</SelectItem>
                    <SelectItem value="department">My department</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                  <SelectTrigger className="h-9 w-auto min-w-[11rem]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GROUP_BY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
          />
          <TaskBoard tasks={filtered} groupBy={groupBy} onOpen={setActive} />
        </TabsContent>

        <TabsContent value="departments" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {TASK_DEPARTMENTS.map((dept) => {
              const rows = tasks.filter((t) => t.department === dept);
              const deptOpen = rows.filter((t) => t.status !== "Completed");
              const deptOverdue = rows.filter(isOverdue);
              return (
                <Card key={dept} className="gap-3 p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{dept}</p>
                      <p className="text-xs text-muted-foreground">
                        {deptOpen.length} open · {deptOverdue.length} overdue · {rows.length} total
                      </p>
                    </div>
                    <Badge variant="secondary">{rows.length}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {deptOpen.slice(0, 4).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActive(t)}
                        className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2 text-left text-xs hover:bg-surface/60"
                      >
                        <span className="min-w-0 truncate text-foreground">{t.title}</span>
                        <span className="shrink-0 text-muted-foreground">{t.owner ?? "Unassigned"}</span>
                      </button>
                    ))}
                    {deptOpen.length === 0 && (
                      <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                        Board is clear
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setValues({ department: dept });
                        setScope("all");
                      }}
                    >
                      Filter board
                    </Button>
                    {deptOpen.some((t) => !t.owner) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const next = deptOpen.find((t) => !t.owner);
                          if (next) claimTask(next.id, me);
                        }}
                      >
                        Claim next
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <Card className="divide-y divide-border p-0 shadow-card">
            {approvals.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">No approval requests right now.</p>
            )}
            {approvals.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 p-3.5">
                <button type="button" className="min-w-0 text-left" onClick={() => setActive(a)}>
                  <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.department} · requested by {a.createdBy} · owner {a.owner ?? "Unassigned"} · due {a.dueDate}
                  </p>
                </button>
                {a.approvalStatus === "Pending" ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => decideApproval(a.id, "Denied")}>Reject</Button>
                    <Button size="sm" onClick={() => decideApproval(a.id, "Approved")}>Approve</Button>
                  </div>
                ) : (
                  <StatusBadge status={a.approvalStatus} />
                )}
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>

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
