import { useSyncExternalStore } from "react";
import { payables, type PayableRow } from "@/lib/company-data";

const KEY = "pb.manual-expenses.v1";

let manual: PayableRow[] = [];
let merged: PayableRow[] = payables;
let overrides: Record<string, Pick<PayableRow, "status" | "paidDate">> = {};
let hydrated = false;

const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ manual, overrides }));
  } catch {
    /* ignore */
  }
}

function recompute() {
  merged = [...manual, ...payables].map((r) => {
    const o = overrides[r.id];
    return o ? { ...r, ...o } : r;
  });
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { manual?: PayableRow[]; overrides?: typeof overrides };
      manual = parsed.manual ?? [];
      overrides = parsed.overrides ?? {};
    }
  } catch {
    /* ignore */
  }
  recompute();
}

export type NewExpenseInput = {
  vendor: string;
  category: string;
  amount: number;
  costDate: string;
  dueDate?: string | null;
  status?: string;
  paidDate?: string | null;
  notes?: string | null;
};

export function addExpense(input: NewExpenseInput): PayableRow {
  hydrate();
  const seq = manual.length + 1;
  const row: PayableRow = {
    id: `EXP-${String(Date.now()).slice(-6)}-${seq}`,
    costDate: input.costDate,
    month: input.costDate.slice(0, 7),
    category: input.category,
    vendor: input.vendor,
    amount: input.amount,
    dueDate: input.dueDate ?? input.costDate,
    status: input.status ?? "Payable",
    paidDate: input.status === "Paid" ? (input.paidDate ?? input.costDate) : null,
    relatedWeek: null,
    notes: input.notes ?? null,
  };
  manual = [row, ...manual];
  persist();
  recompute();
  return row;
}

export function removeExpense(id: string) {
  hydrate();
  manual = manual.filter((r) => r.id !== id);
  persist();
  recompute();
}

export function setExpenseStatus(id: string, status: string) {
  hydrate();
  const paidDate = status === "Paid" ? new Date().toISOString().slice(0, 10) : null;
  overrides = { ...overrides, [id]: { status, paidDate } };
  persist();
  recompute();
}

export function isManualExpense(id: string) {
  return manual.some((r) => r.id === id);
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** All company payables including manually added expenses. */
export function useExpenseLedger(): PayableRow[] {
  return useSyncExternalStore(
    subscribe,
    () => merged,
    () => payables,
  );
}
