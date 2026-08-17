/**
 * Data clock — keeps the operational dataset aligned with the real calendar.
 *
 * The workbook exports that seed this CRM carry fixed historic dates (July –
 * early August 2026). Every dashboard filters by "Today / Yesterday / Last 7
 * days …", so without rebasing, every live view would read zero.
 *
 * We shift every ISO date in the dataset forward by the number of days between
 * the dataset anchor (its busiest, most complete day) and the current date.
 * The shift is a single constant, so all modules — sales, calls, callbacks,
 * attendance, payroll, revenue — stay perfectly interconnected.
 */

/** Busiest complete day in the source dataset. Maps to "today". */
export const DATA_ANCHOR = "2026-08-03";

const DAY_MS = 86_400_000;

/** Parse `YYYY-MM-DD` (and `YYYY-MM-DD HH:MM`) in LOCAL time, never UTC. */
export function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value.trim());
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4] ?? 0),
    Number(m[5] ?? 0),
    Number(m[6] ?? 0),
    0,
  );
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeShift() {
  const anchor = parseLocalDate(DATA_ANCHOR);
  if (!anchor) return 0;
  return Math.max(0, Math.round((startOfToday().getTime() - anchor.getTime()) / DAY_MS));
}

/** Whole days the dataset is shifted forward to line up with today. */
export const DATA_SHIFT_DAYS = computeShift();

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^(\d{4}-\d{2}-\d{2})([ T])(\d{1,2}:\d{2}(?::\d{2})?)(.*)$/;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Shift a `YYYY-MM-DD` / `YYYY-MM-DD HH:MM` string by the dataset offset. */
export function shiftIso(value: string, days = DATA_SHIFT_DAYS): string {
  if (days === 0) return value;

  if (DATE_ONLY.test(value)) {
    const base = parseLocalDate(value);
    if (!base) return value;
    base.setDate(base.getDate() + days);
    return toIso(base);
  }

  const m = DATE_TIME.exec(value);
  if (m) {
    const base = parseLocalDate(m[1]!);
    if (!base) return value;
    base.setDate(base.getDate() + days);
    return `${toIso(base)}${m[2]}${m[3]}${m[4] ?? ""}`;
  }

  return value;
}

/**
 * Rebase every date-looking string field on the given rows, in place.
 * `YYYY-MM` month keys are intentionally left untouched so month groupings in
 * the accounting ledgers stay stable.
 */
export function rebaseRows<T extends object>(rows: T[]): T[] {
  if (DATA_SHIFT_DAYS === 0) return rows;
  for (const row of rows) {
    const record = row as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const value = record[key];
      if (typeof value !== "string") continue;
      if (!DATE_ONLY.test(value) && !DATE_TIME.test(value)) continue;
      record[key] = shiftIso(value);
    }
  }
  return rows;
}

/** Today as `YYYY-MM-DD` in local time. */
export function todayIso() {
  return toIso(startOfToday());
}
