import type { Database } from "@/integrations/supabase/types";

export type ShiftSessionRow = Database["public"]["Tables"]["shift_sessions"]["Row"];
export type ShiftEventRow = Database["public"]["Tables"]["shift_status_events"]["Row"];
export type ShiftSessionUpdate = Database["public"]["Tables"]["shift_sessions"]["Update"];

export interface ShiftDay {
  session: ShiftSessionRow | null;
  events: ShiftEventRow[];
  week: ShiftSessionRow[];
}

/** Pacific (operations) calendar date — the company runs on a Pacific shift. */
export function pacificDate(d: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const BUCKETS = {
  Available: "available_seconds",
  "On Call": "on_call_seconds",
  "Post Call": "on_call_seconds",
  Break: "break_seconds",
  Lunch: "lunch_seconds",
  Meeting: "meeting_seconds",
  Training: "training_seconds",
  "Not Available": "unavailable_seconds",
} as const;

export type ShiftBucketColumn = (typeof BUCKETS)[keyof typeof BUCKETS];

export function bucketColumnFor(status: string): ShiftBucketColumn | null {
  return (BUCKETS as Record<string, ShiftBucketColumn | undefined>)[status] ?? null;
}

export function overrunColumnFor(
  status: string,
): "break_overrun_seconds" | "lunch_overrun_seconds" | null {
  if (status === "Break") return "break_overrun_seconds";
  if (status === "Lunch") return "lunch_overrun_seconds";
  return null;
}

/** Total paid-presence time (everything except break/lunch). */
export function workedSeconds(s: ShiftSessionRow) {
  return (
    s.available_seconds +
    s.on_call_seconds +
    s.meeting_seconds +
    s.training_seconds +
    s.unavailable_seconds
  );
}

export function formatClock(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Los_Angeles",
  });
}

export function formatHm(totalSeconds: number) {
  const total = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m`;
  return `${total}s`;
}
