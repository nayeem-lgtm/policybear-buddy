import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, FileText, Receipt, Wallet2, X } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { useFilters, unique, currency } from "@/lib/use-filters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { expenses } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Policy Bear CRM" },
      { name: "description", content: "Expense claims, approvals, and company spend by category and month." },
      { property: "og:title", content: "Expenses — Policy Bear CRM" },
      { property: "og:description", content: "Expense claims, approvals, and company spend by category and month." },
    ],
  }),
  component: ExpensesPage,
});

type Expense = (typeof expenses)[number];

const monthlySpend = [
  { month: "Mar", amount: 38200 },
  { month: "Apr", amount: 41500 },
  { month: "May", amount: 39800 },
  { month: "Jun", amount: 45200 },
  { month: "Jul", amount: 48900 },
  { month: "Aug", amount: 52100 },
];

function ExpensesPage() {
  const [rows, setRows] = useState<Expense[]>(() => expenses.map((e) => ({ ...e })));
  const [selected, setSelected] = useState<Expense | null>(null);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(rows, {
    searchFields: (r) => [r.vendor, r.id, r.submittedBy],
    filters: {
      category: (r) => r.category,
      status: (r) => r.status,
      department: (r) => r.department,
    },
  });

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const pending = rows.filter((r) => r.status === "Pending Approval");
  const overdue = rows.filter((r) => r.status === "Overdue");
  const approved = rows.filter((r) => r.status === "Approved" || r.status === "Paid");

  function updateStatus(id: string, status: Expense["status"]) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    setSelected((s) => (s && s.id === id ? { ...s, status } : s));
  }

  const maxSpend = Math.max(...monthlySpend.map((m) => m.amount));

  const columns: Column<Expense>[] = [
    {
      key: "vendor",
      header: "Vendor",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.vendor}</p>
          <p className="text-xs text-muted-foreground">{r.id} · {r.submittedBy}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", cell: (r) => r.category },
    { key: "department", header: "Department", cell: (r) => r.department },
    { key: "amount", header: "Amount", cell: (r) => <span className="tabular font-medium">{currency(r.amount)}</span>, align: "right" },
    { key: "dueDate", header: "Due", cell: (r) => <span className="tabular">{r.dueDate}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); updateStatus(r.id, "Approved"); }} disabled={r.status === "Approved" || r.status === "Paid"}>
            <Check className="size-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); updateStatus(r.id, "Draft"); }}>
            <X className="size-3.5" />
          </Button>
        </div>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Expenses"
        description="Company expense claims across vendors and departments, with monthly spend trend."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total spend" value={currency(total)} hint={`${rows.length} claims`} icon={<Wallet2 className="size-4" />} tone="brand" />
        <StatCard label="Pending approval" value={pending.length} icon={<Receipt className="size-4" />} tone="warning" />
        <StatCard label="Overdue" value={overdue.length} tone="danger" />
        <StatCard label="Approved / paid" value={approved.length} tone="success" />
      </div>

      <Card className="p-4 shadow-card">
        <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Monthly spend</p>
        <div className="flex items-end gap-3">
          {monthlySpend.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs tabular text-muted-foreground">{currency(m.amount)}</span>
              <div
                className="w-full rounded-t bg-brand/80"
                style={{ height: `${(m.amount / maxSpend) * 96 + 8}px` }}
              />
              <span className="text-xs text-muted-foreground">{m.month}</span>
            </div>
          ))}
        </div>
      </Card>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search vendor, submitter…"
        filters={[
          { key: "category", label: "Category", options: unique(rows, (r) => r.category) },
          { key: "status", label: "Status", options: unique(rows, (r) => r.status) },
          { key: "department", label: "Department", options: unique(rows, (r) => r.department) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} onRowClick={(r) => setSelected(r)} />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4" onClick={() => setSelected(null)}>
          <Card className="w-full max-w-md p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{selected.vendor}</h3>
              <StatusBadge status={selected.status} />
            </div>
            <div className="mb-4 flex h-32 items-center justify-center rounded-md border border-dashed border-border bg-surface text-sm text-muted-foreground">
              <FileText className="mr-2 size-4" /> Receipt not attached (placeholder)
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>{selected.category}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span>{selected.department}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Submitted by</span><span>{selected.submittedBy}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="tabular font-medium">{currency(selected.amount)}</span></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => updateStatus(selected.id, "Draft")}>Reject</Button>
              <Button onClick={() => updateStatus(selected.id, "Approved")}>Approve</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
