import { formatClock, type ShiftSessionRow } from "@/lib/shift-shared";

export type ExceptionType =
  | "Late"
  | "Early Out"
  | "Missed Sign Out"
  | "Break Overrun"
  | "Lunch Overrun";

export interface AttendanceExceptionRow {
  id: string;
  employee: string;
  team: string;
  type: ExceptionType;
  date: string;
  detail: string;
  minutes: number;
}

/** Standard Pacific shift: 07:00 sign-in (15 min grace) to 16:00 sign-out. */
export const SHIFT_START_MINUTES = 7 * 60;
export const LATE_GRACE_MINUTES = 15;
export const SHIFT_END_MINUTES = 16 * 60;

export function pacificMinutes(iso: string) {
  const label = new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = label.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Derives attendance exceptions from a shift session row. */
export function exceptionsForSession(
  s: ShiftSessionRow,
  employee: string,
  team: string,
): AttendanceExceptionRow[] {
  const out: AttendanceExceptionRow[] = [];
  const base = { employee, team, date: s.work_date };

  const inMinutes = pacificMinutes(s.signed_in_at);
  if (inMinutes > SHIFT_START_MINUTES + LATE_GRACE_MINUTES) {
    out.push({
      ...base,
      id: `${s.id}-late`,
      type: "Late",
      detail: `Signed in ${formatClock(s.signed_in_at)} — ${inMinutes - SHIFT_START_MINUTES} min after 07:00`,
      minutes: inMinutes - SHIFT_START_MINUTES,
    });
  }

  if (s.signed_out_at && !s.auto_closed) {
    const outMinutes = pacificMinutes(s.signed_out_at);
    if (outMinutes < SHIFT_END_MINUTES - 15) {
      out.push({
        ...base,
        id: `${s.id}-early`,
        type: "Early Out",
        detail: `Signed out ${formatClock(s.signed_out_at)} — ${SHIFT_END_MINUTES - outMinutes} min early`,
        minutes: SHIFT_END_MINUTES - outMinutes,
      });
    }
  }

  if (s.auto_closed) {
    out.push({
      ...base,
      id: `${s.id}-missed`,
      type: "Missed Sign Out",
      detail: `No sign-out recorded — closed automatically at ${formatClock(s.signed_out_at)}`,
      minutes: 0,
    });
  }

  if (s.break_overrun_seconds > 0) {
    out.push({
      ...base,
      id: `${s.id}-break`,
      type: "Break Overrun",
      detail: `Break allowance exceeded by ${Math.round(s.break_overrun_seconds / 60)} min across ${s.break_count} break(s)`,
      minutes: Math.round(s.break_overrun_seconds / 60),
    });
  }

  if (s.lunch_overrun_seconds > 0) {
    out.push({
      ...base,
      id: `${s.id}-lunch`,
      type: "Lunch Overrun",
      detail: `Lunch allowance exceeded by ${Math.round(s.lunch_overrun_seconds / 60)} min`,
      minutes: Math.round(s.lunch_overrun_seconds / 60),
    });
  }

  return out;
}

export function exceptionTone(
  type: ExceptionType,
): "danger" | "warning" | "info" {
  if (type === "Late" || type === "Missed Sign Out") return "danger";
  if (type === "Early Out") return "warning";
  return "info";
}
