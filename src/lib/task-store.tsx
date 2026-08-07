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
  createdAt: string;
  updatedAt: string;
  requiresApproval: boolean;
  approvalStatus: "None" | "Pending" | "Approved" | "Denied";
  approver: string | null;
}

export type TaskDraft = Omit<
  WorkTask,
  "id" | "comments" | "createdAt" | "updatedAt" | "approvalStatus"
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
    createdAt: `${t.dueDate} 08:00`,
    updatedAt: `${t.dueDate} 09:15`,
    requiresApproval: i % 6 === 0,
    approvalStatus: i % 6 === 0 ? "Pending" : "None",
    approver: i % 6 === 0 ? "Marcus Hale" : null,
  }));

  const extras: Array<Partial<WorkTask> & { title: string; department: TaskDepartment }> = [
    { title: "Publish August commission statements", department: "Accounting", priority: "High", group: "This week", requiresApproval: true },
    { title: "Onboard 4 new agents — equipment + logins", department: "Human Resources", priority: "Urgent", group: "This week" },
    { title: "Rebuild CallTools ↔ CallGrid attribution report", department: "Operations", priority: "High", group: "This week" },
    { title: "QA calibration session — Team Bravo", department: "Quality Control", priority: "Normal", group: "Next week" },
    { title: "Quarterly board deck — retention narrative", department: "Executive", priority: "Normal", group: "Next week" },
    { title: "Rotate API keys and audit access log", department: "IT / Administration", priority: "High", group: "Escalations" },
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
    createdAt: `${today(-1)} 08:00`,
    updatedAt: `${today(-1)} 08:00`,
    requiresApproval: e.requiresApproval ?? false,
    approvalStatus: (e.requiresApproval ? "Pending" : "None") as WorkTask["approvalStatus"],
    approver: e.requiresApproval ? "Owen Klein" : null,
  })) as WorkTask[];

  return [...built, ...base];
}

const STORAGE_KEY = "pb.tasks.v1";

interface TaskStoreValue {
  tasks: WorkTask[];
  createTask: (draft: TaskDraft) => WorkTask;
  updateTask: (id: string, patch: Partial<WorkTask>) => void;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string) => void;
  claimTask: (id: string, person: string) => void;
  addComment: (id: string, author: string, body: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  decideApproval: (id: string, decision: "Approved" | "Denied") => void;
  resetBoard: () => void;
}

const TaskStoreContext = createContext<TaskStoreValue | null>(null);

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<WorkTask[]>(() => buildSeed());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setTasks(JSON.parse(raw) as WorkTask[]);
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

  const stamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");

  const createTask = useCallback((draft: TaskDraft) => {
    const task: WorkTask = {
      ...draft,
      id: uid("TSK"),
      approvalStatus: draft.requiresApproval ? "Pending" : "None",
      comments: [],
      createdAt: stamp(),
      updatedAt: stamp(),
    };
    setTasks((prev) => [task, ...prev]);
    return task;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<WorkTask>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: stamp() } : t)),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const duplicateTask = useCallback((id: string) => {
    setTasks((prev) => {
      const found = prev.find((t) => t.id === id);
      if (!found) return prev;
      return [
        { ...found, id: uid("TSK"), title: `${found.title} (copy)`, createdAt: stamp(), updatedAt: stamp() },
        ...prev,
      ];
    });
  }, []);

  const claimTask = useCallback((id: string, person: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              owner: person,
              assignees: t.assignees.includes(person) ? t.assignees : [...t.assignees, person],
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
              updatedAt: stamp(),
            }
          : t,
      ),
    );
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)),
              updatedAt: stamp(),
            }
          : t,
      ),
    );
  }, []);

  const addSubtask = useCallback((taskId: string, title: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: [...t.subtasks, { id: uid("SUB"), title, done: false }], updatedAt: stamp() }
          : t,
      ),
    );
  }, []);

  const decideApproval = useCallback((id: string, decision: "Approved" | "Denied") => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, approvalStatus: decision, updatedAt: stamp() } : t)),
    );
  }, []);

  const resetBoard = useCallback(() => setTasks(buildSeed()), []);

  const value = useMemo<TaskStoreValue>(
    () => ({
      tasks,
      createTask,
      updateTask,
      deleteTask,
      duplicateTask,
      claimTask,
      addComment,
      toggleSubtask,
      addSubtask,
      decideApproval,
      resetBoard,
    }),
    [
      tasks,
      createTask,
      updateTask,
      deleteTask,
      duplicateTask,
      claimTask,
      addComment,
      toggleSubtask,
      addSubtask,
      decideApproval,
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
