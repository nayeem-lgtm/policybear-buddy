import type { DateSelection } from "@/components/crm/DateRangeTabs";
import { parseLocalDate } from "@/lib/data-clock";


function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Resolve a preset/custom selection into concrete bounds. */
export function selectionBounds(sel: DateSelection): { from: Date; to: Date } {
  const now = new Date();
  switch (sel.preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "7d": {
      const f = new Date(now);
      f.setDate(f.getDate() - 6);
      return { from: startOfDay(f), to: endOfDay(now) };
    }
    case "month":
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
    case "last-month":
      return {
        from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "year":
      return { from: startOfDay(new Date(now.getFullYear(), 0, 1)), to: endOfDay(now) };
    case "custom": {
      const from = sel.range?.from ? startOfDay(sel.range.from) : startOfDay(now);
      const to = sel.range?.to ? endOfDay(sel.range.to) : endOfDay(sel.range?.from ?? now);
      return { from, to };
    }
  }
}

/** True when an ISO-ish date string falls inside the selection (local time). */
export function inSelection(dateStr: string | null | undefined, sel: DateSelection) {
  if (!dateStr) return false;
  const d = parseLocalDate(dateStr);
  if (!d || Number.isNaN(d.getTime())) return false;
  const { from, to } = selectionBounds(sel);
  return d >= from && d <= to;
}

/** Days covered by a selection (inclusive). */
export function selectionDays(sel: DateSelection) {
  const { from, to } = selectionBounds(sel);
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
}

/** Every day inside the selection as `YYYY-MM-DD`, capped for chart sanity. */
export function selectionDayList(sel: DateSelection, cap = 31): string[] {
  const { from, to } = selectionBounds(sel);
  const days: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to && days.length < 400) {
    days.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
        cursor.getDate(),
      ).padStart(2, "0")}`,
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  if (days.length <= cap) return days;
  const step = Math.ceil(days.length / cap);
  return days.filter((_, i) => i % step === 0 || i === days.length - 1);
}

