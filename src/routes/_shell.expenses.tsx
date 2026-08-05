import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CalendarClock, CircleDollarSign, Wallet } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { useFilters, unique } from "@/lib/use-filters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { payables, months, COST_CATEGORIES, money, type PayableRow } from "@/lib/company-data";

export const Route = createFileRoute("/_shell/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses & Payables — Policy Bear CRM" },
      { name: "description", content: "Company payables ledger — Ringba/CallGrid, CallTools, Gusto payroll & taxes, and commissions." },
      { property: "og:title", content: "Expenses & Payables — Policy Bear CRM" },
      { property: "og:description", content: "Company payables ledger — Ringba/CallGrid, CallTools, Gusto payroll & taxes, and commissions." },
    ],
  }),
  component: ExpensesPage,
});

const MEMO_CATEGORIES = new Set(["Employee Tax Withheld (Memo)", "Employer Taxes"]);
const currentMonth = months[months.length - 1] ?? months[0]!;

function ExpensesPage() {
  const [rows, setRows] = useState<PayableRow[]>(payables);
  const [selected, setSelected] = useState<PayableRow | null>(null);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(rows, {
    searchFields: (r) => [r.vendor, r.id, r.notes ?? ""],
    filters: {
      month: (r) => r.month,
      category: (r) => r.category,
      status: (r) => r.status,
      vendor: (r) => r.vendor,
    },
  });

  const cashRows = useMemo(() => rows.filter((r) => !MEMO_CATEGORIES.has(r.category)), [rows]);
  const totalPayable = cashRows.reduce((s, r) => s + r.amount, 0);
  const paidToDate = cashRows.filter((r) => r.status === "Paid").reduce((s, r) => s + r.amount, 0);
  const dueThisMonth = cashRows.filter((r) => r.month === currentMonth && r.status !== "Paid").reduce((s, r) => s + r.amount, 0);
  const memoTotal = rows.filter((r) => MEMO_CATEGORIES.has(r.category)).reduce((s, r) => s + r.amount, 0);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of cashRows) map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
    return COST_CATEGORIES.filter((c) => !MEMO_CATEGORIES.has(c)).map((c) => ({ category: c, amount: map.get(c) ?? 0 }));
  }, [cashRows]);
  const maxCategory = Math.max(...categoryBreakdown.map((c) => c.amount), 1);

  function markPaid(row: PayableRow) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "Paid", paidDate: r.paidDate ?? new Date().toISOString().slice(0, 10) } : r)));
    setSelected((s) => (s && s.id === row.id ? { ...s, status: "Paid", paidDate: s.paidDate ?? new Date().toISOString().slice(0, 10) } : s));
  }

  function markHold(row: PayableRow) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "Hold" } : r)));
    setSelected((s) => (s && s.id === row.id ? { ...s, status: "Hold" } : s));
  }

  const columns: Column<PayableRow>[] = [
    { key: "id", header: "ID", cell: (r) => <span className="font-medium text-foreground">{r.id}</span> },
    { key: "month", header: "Month", cell: (r) => r.month },
    {
      key: "category",
      header: "Category",
      cell: (r) => (
        <span className={MEMO_CATEGORIES.has(r.category) ? "text-xs text-muted-foreground italic" : "text-sm"}>
          {r.category}{MEMO_CATEGORIES.has(r.category) ? " (memo)" : ""}
        </span>
      ),
    },
    { key: "vendor", header: "Vendor", cell: (r) => r.vendor },
    { key: "amount", header: "Amount", cell: (r) => <span className="tabular font-medium">{money(r.amount)}</span>, align: "right" },
    { key: "dueDate", header: "Due Date", cell: (r) => r.dueDate ?? "—" },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "paidDate", header: "Paid Date", cell: (r) => r.paidDate ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accounting"
        title="Expenses & Payables"
        description="Company payables ledger: Ringba/CallGrid, CallTools, Gusto payroll & taxes, commissions and other costs."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total payable" value={money(totalPayable)} hint="cash items only" icon={<Wallet className="size-4" />} tone="brand" />
        <StatCard label="Paid to date" value={money(paidToDate)} icon={<CircleDollarSign className="size-4" />} tone="success" />
        <StatCard label="Due this month" value={money(dueThisMonth)} hint={currentMonth} icon={<CalendarClock className="size-4" />} tone="warning" />
        <StatCard label="Memo-only (taxes)" value={money(memoTotal)} hint="excluded from cash totals" icon={<AlertCircle className="size-4" />} />
      </div>

      <Card className="space-y-3 p-4 shadow-card">
        <h3 className="text-sm font-semibold text-foreground">Category breakdown (cash payables)</h3>
        <div className="space-y-2.5">
          {categoryBreakdown.map((c) => (
            <div key={c.category} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{c.category}</span>
                <span className="tabular font-medium text-foreground">{money(c.amount)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(c.amount / maxCategory) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search vendor or notes…"
        filters={[
          { key: "month", label: "Month", options: months.slice() },
          { key: "category", label: "Category", options: unique(rows, (r) => r.category) },
          { key: "status", label: "Status", options: unique(rows, (r) => r.status) },
          { key: "vendor", label: "Vendor", options: unique(rows, (r) => r.vendor) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} onRowClick={(r) => setSelected(r)} />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.vendor} — {selected.id}</DialogTitle>
                <DialogDescription>
                  {selected.category}{MEMO_CATEGORIES.has(selected.category) ? " (memo — excluded from cash totals)" : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="tabular font-medium">{money(selected.amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Month</span><span>{selected.month}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Due date</span><span>{selected.dueDate ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid date</span><span>{selected.paidDate ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Related week</span><span>{selected.relatedWeek ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
                <Separator />
                <p className="text-xs text-muted-foreground">{selected.notes ?? "No notes."}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => markHold(selected)} disabled={selected.status === "Hold"}>Hold</Button>
                <Button onClick={() => markPaid(selected)} disabled={selected.status === "Paid"}>Mark Paid</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
