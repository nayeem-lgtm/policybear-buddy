import { useEffect, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/crm/StatusBadge";
import {
  PEOPLE,
  TASK_DEPARTMENTS,
  TASK_GROUPS,
  TASK_PRIORITIES,
  TASK_RECORD_TYPES,
  TASK_STATUSES,
  emptyDraft,
  taskProgress,
  useTaskStore,
  type TaskDepartment,
  type TaskDraft,
  type WorkTask,
} from "@/lib/task-store";

/** Create / edit form used by every board. */
export function TaskFormDialog({
  open,
  onOpenChange,
  currentUser,
  defaultDepartment,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: string;
  defaultDepartment: TaskDepartment;
  task?: WorkTask | undefined;
}) {
  const { createTask, updateTask } = useTaskStore();
  const [draft, setDraft] = useState<TaskDraft>(() => emptyDraft(currentUser, defaultDepartment));
  const [tagText, setTagText] = useState("");

  useEffect(() => {
    if (!open) return;
    if (task) {
      const { id: _id, comments: _c, createdAt: _ca, updatedAt: _ua, ...rest } = task;
      setDraft(rest);
      setTagText(task.tags.join(", "));
    } else {
      setDraft(emptyDraft(currentUser, defaultDepartment));
      setTagText("");
    }
  }, [open, task, currentUser, defaultDepartment]);

  function set<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAssignee(name: string) {
    setDraft((prev) => ({
      ...prev,
      assignees: prev.assignees.includes(name)
        ? prev.assignees.filter((a) => a !== name)
        : [...prev.assignees, name],
    }));
  }

  function submit() {
    const tags = tagText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload: TaskDraft = { ...draft, tags, title: draft.title.trim() || "Untitled task" };
    if (task) updateTask(task.id, payload);
    else createTask(payload);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            Assign ownership, set the department board, and track it through to completion.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Chase pending carrier application"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              rows={3}
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What needs to happen and what does done look like?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Department board</Label>
              <Select value={draft.department} onValueChange={(v) => set("department", v as TaskDepartment)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Group</Label>
              <Select value={draft.group} onValueChange={(v) => set("group", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Owner</Label>
              <Select value={draft.owner ?? "unassigned"} onValueChange={(v) => set("owner", v === "unassigned" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {PEOPLE.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => set("status", v as TaskDraft["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={draft.priority} onValueChange={(v) => set("priority", v as TaskDraft["priority"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Linked record type</Label>
              <Select value={draft.recordType} onValueChange={(v) => set("recordType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_RECORD_TYPES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-start">Start date</Label>
              <Input id="task-start" type="date" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-related">Linked record</Label>
              <Input id="task-related" value={draft.related} onChange={(e) => set("related", e.target.value)} placeholder="POL-7412 / customer name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-est">Estimate (hours)</Label>
              <Input
                id="task-est"
                type="number"
                min={0}
                value={draft.estimateHours}
                onChange={(e) => set("estimateHours", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="task-tags">Tags (comma separated)</Label>
            <Input id="task-tags" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="carrier, compliance" />
          </div>

          <div className="grid gap-2">
            <Label>Assignees</Label>
            <ScrollArea className="h-36 rounded-md border border-border p-2">
              <div className="grid gap-1.5 sm:grid-cols-2">
                {PEOPLE.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.assignees.includes(p)}
                      onCheckedChange={() => toggleAssignee(p)}
                    />
                    <span className="truncate">{p}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Requires approval</p>
              <p className="text-xs text-muted-foreground">
                Routes the task to the approvals queue before it can be closed.
              </p>
            </div>
            <Switch
              checked={draft.requiresApproval}
              onCheckedChange={(v) => set("requiresApproval", v)}
            />
          </div>

          {draft.requiresApproval && (
            <div className="grid gap-1.5">
              <Label>Approver</Label>
              <Select value={draft.approver ?? "unassigned"} onValueChange={(v) => set("approver", v === "unassigned" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {PEOPLE.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>
            <Check className="mr-1 size-4" />
            {task ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Task detail panel: updates, subtasks, comments, ownership. */
export function TaskDetailSheet({
  task,
  onOpenChange,
  currentUser,
  onEdit,
}: {
  task: WorkTask | null;
  onOpenChange: (open: boolean) => void;
  currentUser: string;
  onEdit: (task: WorkTask) => void;
}) {
  const { updateTask, addComment, addSubtask, toggleSubtask, claimTask, deleteTask, decideApproval } =
    useTaskStore();
  const [comment, setComment] = useState("");
  const [subtask, setSubtask] = useState("");

  if (!task) return null;

  return (
    <Sheet open={!!task} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="pr-8 text-left">{task.title}</SheetTitle>
          <p className="text-left text-xs text-muted-foreground">
            {task.id} · {task.department} · {task.group}
          </p>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <StatusBadge status={task.priority} />
            {task.requiresApproval && <StatusBadge status={task.approvalStatus === "None" ? "Pending" : task.approvalStatus} />}
            {task.tags.map((t) => (
              <Badge key={t} variant="secondary">{t}</Badge>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">{task.description || "No description yet."}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={task.status} onValueChange={(v) => updateTask(task.id, { status: v as WorkTask["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Owner</Label>
              <Select
                value={task.owner ?? "unassigned"}
                onValueChange={(v) => updateTask(task.id, { owner: v === "unassigned" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {PEOPLE.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-md border border-border p-3 text-xs text-muted-foreground sm:grid-cols-4">
            <div><p className="text-foreground">{task.startDate}</p>Start</div>
            <div><p className="text-foreground">{task.dueDate}</p>Due</div>
            <div><p className="text-foreground">{task.estimateHours}h</p>Estimate</div>
            <div><p className="text-foreground">{task.createdBy}</p>Created by</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Progress</p>
              <span className="text-xs text-muted-foreground">{taskProgress(task)}%</span>
            </div>
            <Progress value={taskProgress(task)} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Subtasks</p>
            {task.subtasks.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={s.done} onCheckedChange={() => toggleSubtask(task.id, s.id)} />
                <span className={s.done ? "text-muted-foreground line-through" : ""}>{s.title}</span>
              </label>
            ))}
            <div className="flex gap-2">
              <Input
                value={subtask}
                onChange={(e) => setSubtask(e.target.value)}
                placeholder="Add a subtask"
                className="h-9"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!subtask.trim()) return;
                  addSubtask(task.id, subtask.trim());
                  setSubtask("");
                }}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Assignees</p>
            <div className="flex flex-wrap gap-1.5">
              {task.assignees.length === 0 && (
                <span className="text-xs text-muted-foreground">Nobody assigned yet.</span>
              )}
              {task.assignees.map((a) => (
                <Badge key={a} variant="outline">{a}</Badge>
              ))}
            </div>
            {task.owner !== currentUser && (
              <Button size="sm" variant="secondary" onClick={() => claimTask(task.id, currentUser)}>
                Take ownership
              </Button>
            )}
          </div>

          {task.requiresApproval && task.approvalStatus === "Pending" && (
            <div className="flex items-center justify-between rounded-md border border-warning/40 bg-warning/10 p-3">
              <p className="text-sm text-foreground">
                Approval pending{task.approver ? ` · ${task.approver}` : ""}
              </p>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => decideApproval(task.id, "Denied")}>Deny</Button>
                <Button size="sm" onClick={() => decideApproval(task.id, "Approved")}>Approve</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Updates</p>
            <div className="space-y-2">
              {task.comments.map((c) => (
                <div key={c.id} className="rounded-md border border-border p-2.5">
                  <p className="text-xs text-muted-foreground">{c.author} · {c.createdAt}</p>
                  <p className="text-sm text-foreground">{c.body}</p>
                </div>
              ))}
              {task.comments.length === 0 && (
                <p className="text-xs text-muted-foreground">No updates yet.</p>
              )}
            </div>
            <Textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write an update…"
            />
            <Button
              size="sm"
              onClick={() => {
                if (!comment.trim()) return;
                addComment(task.id, currentUser, comment.trim());
                setComment("");
              }}
            >
              Post update
            </Button>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => onEdit(task)}>Edit task</Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => {
                deleteTask(task.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="mr-1 size-4" />
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
