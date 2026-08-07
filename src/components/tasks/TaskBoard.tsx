import { ChevronDown, ChevronRight, Copy, MessageSquare, Paperclip } from "lucide-react";
import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { cn } from "@/lib/utils";
import {
  PEOPLE,
  TASK_PRIORITIES,
  TASK_STATUSES,
  isOverdue,
  taskProgress,
  useTaskStore,
  type WorkTask,
} from "@/lib/task-store";

export type GroupBy = "group" | "status" | "department" | "owner" | "priority";

function groupKey(task: WorkTask, by: GroupBy) {
  if (by === "owner") return task.owner ?? "Unassigned";
  return String(task[by]);
}

const STATUS_ACCENT: Record<string, string> = {
  "Not Started": "bg-muted-foreground/40",
  "In Progress": "bg-brand",
  Waiting: "bg-warning",
  Blocked: "bg-destructive",
  Completed: "bg-success",
};

/**
 * Monday.com-style grouped board: every row is editable inline
 * (status, owner, priority) and opens a detail panel on click.
 */
export function TaskBoard({
  tasks,
  groupBy,
  onOpen,
  emptyLabel = "No tasks match the current filters.",
}: {
  tasks: WorkTask[];
  groupBy: GroupBy;
  onOpen: (task: WorkTask) => void;
  emptyLabel?: string;
}) {
  const { updateTask, duplicateTask } = useTaskStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const map = new Map<string, WorkTask[]>();
    for (const t of tasks) {
      const key = groupKey(t, groupBy);
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks, groupBy]);

  if (tasks.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground shadow-card">{emptyLabel}</Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(([key, rows]) => {
        const done = rows.filter((r) => r.status === "Completed").length;
        const isCollapsed = collapsed[key];
        return (
          <Card key={key} className="gap-0 overflow-hidden p-0 shadow-card">
            <button
              type="button"
              onClick={() => setCollapsed((p) => ({ ...p, [key]: !p[key] }))}
              className="flex w-full items-center gap-2 border-b border-border bg-surface/70 px-3 py-2.5 text-left"
            >
              {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
              <span className="text-sm font-semibold text-foreground">{key}</span>
              <Badge variant="secondary">{rows.length}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {done}/{rows.length} done
              </span>
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-border">
                {rows.map((t) => (
                  <div
                    key={t.id}
                    className="grid grid-cols-1 items-center gap-2 px-3 py-2.5 hover:bg-surface/50 lg:grid-cols-[minmax(0,2.2fr)_10rem_11rem_8rem_8rem_9rem_2.5rem]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn("h-8 w-1 shrink-0 rounded-full", STATUS_ACCENT[t.status])} />
                      <button
                        type="button"
                        onClick={() => onOpen(t)}
                        className="min-w-0 text-left"
                      >
                        <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.id} · {t.department} · {t.recordType}
                          {t.related && t.related !== "—" ? ` · ${t.related}` : ""}
                        </p>
                      </button>
                    </div>

                    <Select value={t.status} onValueChange={(v) => updateTask(t.id, { status: v as WorkTask["status"] })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TASK_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={t.owner ?? "unassigned"}
                      onValueChange={(v) => updateTask(t.id, { owner: v === "unassigned" ? null : v })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {PEOPLE.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={t.priority} onValueChange={(v) => updateTask(t.id, { priority: v as WorkTask["priority"] })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="text-xs">
                      <p className={cn("tabular", isOverdue(t) ? "font-semibold text-destructive" : "text-foreground")}>
                        {t.dueDate}
                      </p>
                      <p className="text-muted-foreground">{isOverdue(t) ? "overdue" : "due"}</p>
                    </div>

                    <div className="space-y-1">
                      <Progress value={taskProgress(t)} className="h-1.5" />
                      <div className="flex items-center gap-2 text-[0.68rem] text-muted-foreground">
                        <span className="tabular">{taskProgress(t)}%</span>
                        <span className="flex items-center gap-0.5"><MessageSquare className="size-3" />{t.comments.length}</span>
                        <span className="flex items-center gap-0.5"><Paperclip className="size-3" />{t.subtasks.length}</span>
                        {t.requiresApproval && t.approvalStatus !== "None" && (
                          <StatusBadge status={t.approvalStatus} className="px-1 py-0 text-[0.6rem]" />
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 justify-self-end text-muted-foreground"
                      aria-label="Duplicate task"
                      onClick={() => duplicateTask(t.id)}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
