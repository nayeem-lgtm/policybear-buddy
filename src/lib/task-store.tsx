/**
 * Front-end task management store (Monday.com style boards).
 *
 * Everything lives in React state + localStorage so the UI is fully usable
 * before the API is wired. Replace the reducer bodies with API calls later —
 * the component layer only talks to the hooks exported here.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { employees, tasks as seedTasks } from "@/lib/mock-data";

export const TASK_STATUSES = ["Not Started", "In Progress", "Waiting", "Blocked", "Completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["Low", "Normal", "High", "Urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_DEPARTMENTS = [
  "Executive",
  "Sales Floor",
  "Quality Control",
  "Human Resources",
  "Accounting",
  "Operations",
  "IT / Administration",
] as const;
export type TaskDepartment = (typeof TASK_DEPARTMENTS)[number];

export const TASK_RECORD_TYPES = [
  "General",
  "Policy",
  "Call",
  "Customer",
  "Attendance",
  "Payroll",
  "QA",
  "Chargeback",
  "Training",
] as const;

export const TASK_RECURRENCES = ["None", "Daily", "Weekly", "Biweekly", "Monthly"] as const;
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number];

export const REMINDER_OFFSETS = [
  { label: "No reminder", value: "none" },
  { label: "At due date 9:00", value: "due-9" },
  { label: "1 day before", value: "1d" },
  { label: "2 days before", value: "2d" },
  { label: "1 hour from now", value: "1h" },
] as const;

export interface TaskComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  done: boolean;
}

export type TaskActivityKind =
  | "created"
  | "status"
  | "owner"
  | "priority"
  | "moved"
  | "field"
  | "comment"
  | "subtask"
  | "approval"
  | "reminder"
  | "recurrence";

export interface TaskActivity {
  id: string;
  kind: TaskActivityKind;
  actor: string;
  message: string;
  at: string;
}

export interface WorkTask {
  id: string;
  title: string;
  description: string;
  department: TaskDepartment;
  group: string;
  status: TaskStatus;
  priority: TaskPriority;
  owner: string | null;
  assignees: string[];
  createdBy: string;
  startDate: string;
  dueDate: string;
  estimateHours: number;
  recordType: string;
  related: string;
  tags: string[];
  subtasks: TaskSubtask[];
  comments: TaskComment[];
  activity: TaskActivity[];
  createdAt: string;
  updatedAt: string;
  requiresApproval: boolean;
  approvalStatus: "None" | "Pending" | "Approved" | "Denied";
  approver: string | null;
  /** ISO-ish local datetime string ("YYYY-MM-DDTHH:mm") or null. */
  reminderAt: string | null;
  reminderSent: boolean;
  recurrence: TaskRecurrence;
  /** Set on tasks spawned by a recurring parent. */
  recurredFrom?: string | null;
}

export type TaskDraft = Omit<
  WorkTask,
  "id" | "comments" | "activity" | "createdAt" | "updatedAt" | "approvalStatus" | "reminderSent"
> & { approvalStatus?: WorkTask["approvalStatus"] };

export const TASK_GROUPS = [
  "This week",
  "Next week",
  "Backlog",
  "Escalations",
] as const;

export const PEOPLE = Array.from(new Set(employees.map((e) => e.name)));

function today(offset = 0) {
  const d = new Date(2026, 7, 7 + offset);
  return d.toISOString().slice(0, 10);
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function activity(kind: TaskActivityKind, actor: string, message: string): TaskActivity {
  return { id: uid("ACT"), kind, actor, message, at: nowStamp() };
}

/** Shift a YYYY-MM-DD date string by a recurrence step. */
export function nextRecurrenceDate(date: string, recurrence: TaskRecurrence) {
  const [y, m, d] = date.split("-").map(Number);
  const base = new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
  if (recurrence === "Daily") base.setDate(base.getDate() + 1);
  else if (recurrence === "Weekly") base.setDate(base.getDate() + 7);
  else if (recurrence === "Biweekly") base.setDate(base.getDate() + 14);
  else if (recurrence === "Monthly") base.setMonth(base.getMonth() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}

const DEPT_BY_INDEX = TASK_DEPARTMENTS;

/** Seed board built from existing demo tasks plus richer department work. */
function buildSeed(): WorkTask[] {
  const base: WorkTask[] = seedTasks.map((t, i) => ({
    id: t.id,
    title: t.title,
    description: t.latestComment,
    department: DEPT_BY_INDEX[(i + 1) % DEPT_BY_INDEX.length]!,
    group: TASK_GROUPS[i % TASK_GROUPS.length]!,
    status: t.status as TaskStatus,
    priority: t.priority,
    owner: employees[i % employees.length]!.name,
    assignees: [employees[i % employees.length]!.name, employees[(i + 5) % employees.length]!.name],
    createdBy: t.assignedBy,
    startDate: today(-(i % 5)),
    dueDate: t.dueDate,
    estimateHours: 1 + (i % 6),
    recordType: t.recordType,
    related: t.related,
    tags: [["retention", "carrier", "compliance", "payroll", "coaching"][i % 5]!],
    subtasks: [
      { id: uid("SUB"), title: "Gather documentation", done: i % 2 === 0 },
      { id: uid("SUB"), title: "Update record in CRM", done: i % 3 === 0 },
    ],
    comments: [
      {
        id: uid("CMT"),
        author: t.assignedBy,
        body: t.latestComment,
        createdAt: `${t.dueDate} 09:15`,
      },
    ],
    activity: [
      { id: uid("ACT"), kind: "created", actor: t.assignedBy, message: "Task created", at: `${t.dueDate} 08:00` },
      { id: uid("ACT"), kind: "comment", actor: t.assignedBy, message: "Posted an update", at: `${t.dueDate} 09:15` },
    ],
    createdAt: `${t.dueDate} 08:00`,
    updatedAt: `${t.dueDate} 09:15`,
    requiresApproval: i % 6 === 0,
    approvalStatus: (i % 6 === 0 ? "Pending" : "None") as WorkTask["approvalStatus"],
    approver: i % 6 === 0 ? "Marcus Hale" : null,
    reminderAt: i % 4 === 0 ? `${t.dueDate}T09:00` : null,
    reminderSent: false,
    recurrence: (i % 5 === 0 ? "Weekly" : "None") as TaskRecurrence,
    recurredFrom: null,
  }));

  const extras: Array<Partial<WorkTask> & { title: string; department: TaskDepartment }> = [
    { title: "Publish August commission statements", department: "Accounting", priority: "High", group: "This week", requiresApproval: true, recurrence: "Monthly" },
    { title: "Onboard 4 new agents — equipment + logins", department: "Human Resources", priority: "Urgent", group: "This week" },
    { title: "Rebuild CallTools ↔ CallGrid attribution report", department: "Operations", priority: "High", group: "This week", recurrence: "Weekly" },
    { title: "QA calibration session — Team Bravo", department: "Quality Control", priority: "Normal", group: "Next week", recurrence: "Weekly" },
    { title: "Quarterly board deck — retention narrative", department: "Executive", priority: "Normal", group: "Next week" },
    { title: "Rotate API keys and audit access log", department: "IT / Administration", priority: "High", group: "Escalations", recurrence: "Monthly" },
    { title: "Chase 12 pending carrier applications", department: "Sales Floor", priority: "Urgent", group: "Escalations" },
    { title: "Draft OEP staffing plan", department: "Operations", priority: "Normal", group: "Backlog" },
  ];

  const built = extras.map((e, i) => ({
    id: uid("TSK"),
    title: e.title,
    description: "Created from the departmental planning board.",
    department: e.department,
    group: e.group ?? "Backlog",
    status: (["Not Started", "In Progress", "Waiting", "Blocked"] as TaskStatus[])[i % 4]!,
    priority: (e.priority ?? "Normal") as TaskPriority,
    owner: employees[(i * 3) % employees.length]!.name,
    assignees: [employees[(i * 3) % employees.length]!.name],
    createdBy: "Owen Klein",
    startDate: today(-1),
    dueDate: today(2 + i),
    estimateHours: 2 + i,
    recordType: "General",
    related: "—",
    tags: ["planning"],
    subtasks: [],
    comments: [],
    activity: [
      { id: uid("ACT"), kind: "created", actor: "Owen Klein", message: "Task created", at: `${today(-1)} 08:00` },
    ],
    createdAt: `${today(-1)} 08:00`,
    updatedAt: `${today(-1)} 08:00`,
    requiresApproval: e.requiresApproval ?? false,
    approvalStatus: (e.requiresApproval ? "Pending" : "None") as WorkTask["approvalStatus"],
    approver: e.requiresApproval ? "Owen Klein" : null,
    reminderAt: `${today(2 + i)}T09:00`,
    reminderSent: false,
    recurrence: (e.recurrence ?? "None") as TaskRecurrence,
    recurredFrom: null,
  })) as WorkTask[];

  return [...built, ...base];
}

const STORAGE_KEY = "pb.tasks.v2";

/** Normalise cached tasks written by older versions of the store. */
function hydrate(list: WorkTask[]): WorkTask[] {
  return list.map((t) => ({
    ...t,
    activity: t.activity ?? [],
    reminderAt: t.reminderAt ?? null,
    reminderSent: t.reminderSent ?? false,
    recurrence: t.recurrence ?? "None",
  }));
}

export type BoardField = "group" | "status" | "department" | "owner" | "priority";

interface TaskStoreValue {
  tasks: WorkTask[];
  currentActor: string;
  setCurrentActor: (name: string) => void;
  createTask: (draft: TaskDraft) => WorkTask;
  updateTask: (id: string, patch: Partial<WorkTask>) => void;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string) => void;
  claimTask: (id: string, person: string) => void;
  addComment: (id: string, author: string, body: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  decideApproval: (id: string, decision: "Approved" | "Denied") => void;
  /** Drag-and-drop: drop a task into a board column/group. */
  moveTask: (id: string, field: BoardField, value: string) => void;
  /** Reorder within the board (drag a row above/below another). */
  reorderTask: (id: string, beforeId: string | null) => void;
  snoozeReminder: (id: string, minutes: number) => void;
  clearReminder: (id: string) => void;
  dueReminders: WorkTask[];
  resetBoard: () => void;
}

const TaskStoreContext = createContext<TaskStoreValue | null>(null);

function localDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<WorkTask[]>(() => buildSeed());
  const [currentActor, setCurrentActor] = useState("Owen Klein");
  const [dueReminders, setDueReminders] = useState<WorkTask[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setTasks(hydrate(JSON.parse(raw) as WorkTask[]));
    } catch {
      /* ignore corrupt cache */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      /* storage full / unavailable */
    }
  }, [tasks]);

  const stamp = nowStamp;

  const log = useCallback(
    (id: string, entry: TaskActivity) =>
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, activity: [entry, ...t.activity], updatedAt: stamp() } : t,
        ),
      ),
    [],
  );

  const createTask = useCallback(
    (draft: TaskDraft) => {
      const task: WorkTask = {
        ...draft,
        id: uid("TSK"),
        approvalStatus: draft.requiresApproval ? "Pending" : "None",
        comments: [],
        activity: [activity("created", draft.createdBy, "Task created")],
        createdAt: stamp(),
        updatedAt: stamp(),
        reminderSent: false,
      };
      setTasks((prev) => [task, ...prev]);
      return task;
    },
    [],
  );

  /** Spawn the next occurrence of a recurring task when it is completed. */
  const spawnRecurrence = useCallback((source: WorkTask) => {
    if (source.recurrence === "None") return;
    const nextDue = nextRecurrenceDate(source.dueDate, source.recurrence);
    const nextStart = nextRecurrenceDate(source.startDate, source.recurrence);
    const next: WorkTask = {
      ...source,
      id: uid("TSK"),
      status: "Not Started",
      startDate: nextStart,
      dueDate: nextDue,
      subtasks: source.subtasks.map((s) => ({ ...s, id: uid("SUB"), done: false })),
      comments: [],
      activity: [
        activity("recurrence", "System", `Recurring occurrence created from ${source.id} (${source.recurrence})`),
      ],
      createdAt: stamp(),
      updatedAt: stamp(),
      approvalStatus: source.requiresApproval ? "Pending" : "None",
      reminderAt: source.reminderAt ? `${nextDue}T${source.reminderAt.slice(11) || "09:00"}` : null,
      reminderSent: false,
      recurredFrom: source.id,
    };
    setTasks((prev) => [next, ...prev]);
    toast.success("Recurring task scheduled", {
      description: `${next.title} — next due ${nextDue}`,
    });
  }, []);

  const updateTask = useCallback(
    (id: string, patch: Partial<WorkTask>) => {
      setTasks((prev) => {
        let recurringSource: WorkTask | null = null;
        const next = prev.map((t) => {
          if (t.id !== id) return t;
          const entries: TaskActivity[] = [];
          if (patch.status && patch.status !== t.status) {
            entries.push(activity("status", currentActor, `Status ${t.status} → ${patch.status}`));
            if (patch.status === "Completed" && t.recurrence !== "None") recurringSource = t;
          }
          if (patch.owner !== undefined && patch.owner !== t.owner) {
            entries.push(
              activity("owner", currentActor, `Owner ${t.owner ?? "Unassigned"} → ${patch.owner ?? "Unassigned"}`),
            );
          }
          if (patch.priority && patch.priority !== t.priority) {
            entries.push(activity("priority", currentActor, `Priority ${t.priority} → ${patch.priority}`));
          }
          if (patch.group && patch.group !== t.group) {
            entries.push(activity("moved", currentActor, `Moved to group “${patch.group}”`));
          }
          if (patch.department && patch.department !== t.department) {
            entries.push(activity("moved", currentActor, `Moved to ${patch.department} board`));
          }
          if (patch.dueDate && patch.dueDate !== t.dueDate) {
            entries.push(activity("field", currentActor, `Due date ${t.dueDate} → ${patch.dueDate}`));
          }
          if (patch.reminderAt !== undefined && patch.reminderAt !== t.reminderAt) {
            entries.push(
              activity(
                "reminder",
                currentActor,
                patch.reminderAt ? `Reminder set for ${patch.reminderAt.replace("T", " ")}` : "Reminder cleared",
              ),
            );
          }
          if (patch.recurrence && patch.recurrence !== t.recurrence) {
            entries.push(activity("recurrence", currentActor, `Recurrence set to ${patch.recurrence}`));
          }
          if (entries.length === 0) entries.push(activity("field", currentActor, "Task details updated"));
          const reminderChanged = patch.reminderAt !== undefined && patch.reminderAt !== t.reminderAt;
          return {
            ...t,
            ...patch,
            reminderSent: reminderChanged ? false : (patch.reminderSent ?? t.reminderSent),
            activity: [...entries, ...t.activity],
            updatedAt: stamp(),
          };
        });
        if (recurringSource) setTimeout(() => spawnRecurrence(recurringSource!), 0);
        return next;
      });
    },
    [currentActor, spawnRecurrence],
  );

  const moveTask = useCallback(
    (id: string, field: BoardField, value: string) => {
      const patch: Partial<WorkTask> =
        field === "owner"
          ? { owner: value === "Unassigned" ? null : value }
          : ({ [field]: value } as Partial<WorkTask>);
      updateTask(id, patch);
    },
    [updateTask],
  );

  const reorderTask = useCallback((id: string, beforeId: string | null) => {
    setTasks((prev) => {
      const from = prev.findIndex((t) => t.id === id);
      if (from === -1) return prev;
      const moved = prev[from]!;
      const rest = prev.filter((t) => t.id !== id);
      if (!beforeId) return [...rest, moved];
      const to = rest.findIndex((t) => t.id === beforeId);
      if (to === -1) return prev;
      return [...rest.slice(0, to), moved, ...rest.slice(to)];
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const duplicateTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const found = prev.find((t) => t.id === id);
        if (!found) return prev;
        return [
          {
            ...found,
            id: uid("TSK"),
            title: `${found.title} (copy)`,
            comments: [],
            activity: [activity("created", currentActor, `Duplicated from ${found.id}`)],
            createdAt: stamp(),
            updatedAt: stamp(),
            reminderSent: false,
          },
          ...prev,
        ];
      });
    },
    [currentActor],
  );

  const claimTask = useCallback((id: string, person: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              owner: person,
              assignees: t.assignees.includes(person) ? t.assignees : [...t.assignees, person],
              activity: [activity("owner", person, `${person} took ownership`), ...t.activity],
              updatedAt: stamp(),
            }
          : t,
      ),
    );
  }, []);

  const addComment = useCallback((id: string, author: string, body: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              comments: [...t.comments, { id: uid("CMT"), author, body, createdAt: stamp() }],
              activity: [activity("comment", author, "Posted an update"), ...t.activity],
              updatedAt: stamp(),
            }
          : t,
      ),
    );
  }, []);

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const target = t.subtasks.find((s) => s.id === subtaskId);
          return {
            ...t,
            subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)),
            activity: [
              activity(
                "subtask",
                currentActor,
                `${target?.done ? "Reopened" : "Completed"} subtask “${target?.title ?? ""}”`,
              ),
              ...t.activity,
            ],
            updatedAt: stamp(),
          };
        }),
      );
    },
    [currentActor],
  );

  const addSubtask = useCallback(
    (taskId: string, title: string) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: [...t.subtasks, { id: uid("SUB"), title, done: false }],
                activity: [activity("subtask", currentActor, `Added subtask “${title}”`), ...t.activity],
                updatedAt: stamp(),
              }
            : t,
        ),
      );
    },
    [currentActor],
  );

  const decideApproval = useCallback(
    (id: string, decision: "Approved" | "Denied") => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                approvalStatus: decision,
                activity: [activity("approval", currentActor, `Approval ${decision.toLowerCase()}`), ...t.activity],
                updatedAt: stamp(),
              }
            : t,
        ),
      );
    },
    [currentActor],
  );

  const snoozeReminder = useCallback(
    (id: string, minutes: number) => {
      const next = new Date(Date.now() + minutes * 60_000);
      updateTask(id, { reminderAt: localDateTime(next) });
    },
    [updateTask],
  );

  const clearReminder = useCallback(
    (id: string) => updateTask(id, { reminderAt: null, reminderSent: true }),
    [updateTask],
  );

  /** Reminder ticker: fires an in-app toast when a reminder becomes due. */
  useEffect(() => {
    const tick = () => {
      const now = localDateTime(new Date());
      const due = tasks.filter(
        (t) => t.reminderAt && !t.reminderSent && t.status !== "Completed" && t.reminderAt <= now,
      );
      setDueReminders(due);
      if (due.length === 0) return;
      setTasks((prev) =>
        prev.map((t) =>
          due.some((d) => d.id === t.id)
            ? {
                ...t,
                reminderSent: true,
                activity: [activity("reminder", "System", "Reminder delivered"), ...t.activity],
              }
            : t,
        ),
      );
      for (const t of due) {
        toast.warning(`Reminder · ${t.title}`, {
          description: `${t.department} · due ${t.dueDate}${t.owner ? ` · ${t.owner}` : ""}`,
        });
      }
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [tasks]);

  const resetBoard = useCallback(() => setTasks(buildSeed()), []);

  const value = useMemo<TaskStoreValue>(
    () => ({
      tasks,
      currentActor,
      setCurrentActor,
      createTask,
      updateTask,
      deleteTask,
      duplicateTask,
      claimTask,
      addComment,
      toggleSubtask,
      addSubtask,
      decideApproval,
      moveTask,
      reorderTask,
      snoozeReminder,
      clearReminder,
      dueReminders,
      resetBoard,
    }),
    [
      tasks,
      currentActor,
      createTask,
      updateTask,
      deleteTask,
      duplicateTask,
      claimTask,
      addComment,
      toggleSubtask,
      addSubtask,
      decideApproval,
      moveTask,
      reorderTask,
      snoozeReminder,
      clearReminder,
      dueReminders,
      resetBoard,
    ],
  );

  return <TaskStoreContext.Provider value={value}>{children}</TaskStoreContext.Provider>;
}

export function useTaskStore() {
  const ctx = useContext(TaskStoreContext);
  if (!ctx) throw new Error("useTaskStore must be used inside TaskStoreProvider");
  return ctx;
}

export function emptyDraft(creator: string, department: TaskDepartment): TaskDraft {
  return {
    title: "",
    description: "",
    department,
    group: "This week",
    status: "Not Started",
    priority: "Normal",
    owner: creator,
    assignees: [creator],
    createdBy: creator,
    startDate: today(),
    dueDate: today(3),
    estimateHours: 2,
    recordType: "General",
    related: "—",
    tags: [],
    subtasks: [],
    requiresApproval: false,
    approver: null,
    reminderAt: null,
    recurrence: "None",
    recurredFrom: null,
  };
}

export function taskProgress(task: WorkTask) {
  if (task.status === "Completed") return 100;
  if (task.subtasks.length === 0) return task.status === "In Progress" ? 40 : task.status === "Waiting" ? 25 : 0;
  return Math.round((task.subtasks.filter((s) => s.done).length / task.subtasks.length) * 100);
}

export function isOverdue(task: WorkTask) {
  return task.status !== "Completed" && task.dueDate < today();
}

export function reminderState(task: WorkTask): "none" | "scheduled" | "due" {
  if (!task.reminderAt) return "none";
  if (task.reminderSent) return "due";
  return task.reminderAt <= localDateTime(new Date()) ? "due" : "scheduled";
}
