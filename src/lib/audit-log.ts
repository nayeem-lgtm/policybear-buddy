import { useSyncExternalStore } from "react";

import { auditLogs } from "@/lib/mock-data";

const KEY = "pb.audit-trail.v1";
const MAX_EVENTS = 500;

export type AuditCategory =
  | "Auth"
  | "Finance"
  | "Revenue"
  | "Payroll"
  | "Expense"
  | "Calls"
  | "Attendance"
  | "System";

export interface AuditEvent {
  id: string;
  timestamp: string; // "YYYY-MM-DD HH:mm:ss"
  actor: string;
  actorEmail: string | null;
  category: AuditCategory;
  action: string;
  recordType: string;
  recordId: string;
  reason: string;
  ip: string;
  detail: Record<string, unknown>;
  source: "live" | "seed";
}

export interface AuditInput {
  actor?: string | null;
  actorEmail?: string | null;
  category: AuditCategory;
  action: string;
  recordType?: string;
  recordId?: string;
  reason?: string;
  detail?: Record<string, unknown>;
}

const seeded: AuditEvent[] = auditLogs.map((r) => ({
  id: r.id,
  timestamp: `${r.timestamp}:00`,
  actor: r.actor,
  actorEmail: null,
  category: (
    {
      Payroll: "Payroll",
      Attendance: "Attendance",
      Report: "Revenue",
      Policy: "Finance",
      User: "System",
      Callback: "Calls",
    } as Record<string, AuditCategory>
  )[r.recordType] ?? "System",
  action: r.action,
  recordType: r.recordType,
  recordId: r.recordId,
  reason: r.reason,
  ip: r.ip,
  detail: {},
  source: "seed",
}));

let live: AuditEvent[] = [];
let merged: AuditEvent[] = seeded;
let hydrated = false;
const listeners = new Set<() => void>();
const seenKeys = new Set<string>();

function stamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function recompute() {
  merged = [...live, ...seeded].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(live.slice(0, MAX_EVENTS)));
  } catch {
    /* ignore */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) live = (JSON.parse(raw) as AuditEvent[]) ?? [];
  } catch {
    live = [];
  }
  recompute();
}

/** Append an event to the audit trail. */
export function recordAudit(input: AuditInput): AuditEvent {
  hydrate();
  const event: AuditEvent = {
    id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
    timestamp: stamp(),
    actor: input.actor?.trim() || "System",
    actorEmail: input.actorEmail ?? null,
    category: input.category,
    action: input.action,
    recordType: input.recordType ?? input.category,
    recordId: input.recordId ?? "—",
    reason: input.reason ?? "—",
    ip: typeof window === "undefined" ? "server" : "session",
    detail: input.detail ?? {},
    source: "live",
  };
  live = [event, ...live].slice(0, MAX_EVENTS);
  persist();
  recompute();
  return event;
}

/**
 * Records a calculation event once per unique key for this browser session, so
 * re-renders of a dashboard do not flood the trail.
 */
export function recordCalculationOnce(key: string, input: AuditInput) {
  if (seenKeys.has(key)) return;
  seenKeys.add(key);
  recordAudit(input);
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Full audit trail, newest first (live events plus historic records). */
export function useAuditTrail(): AuditEvent[] {
  return useSyncExternalStore(
    subscribe,
    () => merged,
    () => seeded,
  );
}

export const AUDIT_CATEGORIES: AuditCategory[] = [
  "Auth",
  "Finance",
  "Revenue",
  "Payroll",
  "Expense",
  "Calls",
  "Attendance",
  "System",
];
