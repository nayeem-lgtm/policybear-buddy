import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Lock, ShieldCheck, Wallet } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { useFilters, unique, currency } from "@/lib/use-filters";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { payrollRows, type PayrollRow } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll — Policy Bear CRM" },
      { name: "description", content: "Payroll register, attendance-driven deductions, and period approvals." },
      { property: "og:title", content: "Payroll — Policy Bear CRM" },
      { property: "og:description", content: "Payroll register, attendance-driven deductions, and period approvals." },
    ],
  }),
  component: PayrollPage,
});

const periods = ["Jul 16 – Jul 31, 2026", "Aug 1 – Aug 15, 2026"];

const deductionNotes = [
  "Late arrivals (2) — 45 min unpaid",
  "Extended break overage — 12 min",
  "Unapproved absence — half day",
  "Missed clock-out adjustment",
  "Health insurance premium withholding",
  "401(k) contribution — 4%",
];

function noteFor(row: PayrollRow) {
  return deductionNotes[payrollRows.indexOf(row) % deductionNotes.length];
}

function PayrollPage() {
  const [period, setPeriod] = useState(periods[1]!);
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<PayrollRow | null>(null);

  const periodRows = useMemo(() => payrollRows, [period]);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(periodRows, {
    searchFields: (r) => [r.employee, r.id],
    filters: {
      status: (r) => r.status,
      role: (r) => r.role,
    },
  });

  const totalNet = periodRows.reduce((s, r) => s + r.net, 0);
  const totalDeductions = periodRows.reduce((s, r) => s + r.deductions, 0);
  const approvedCount = periodRows.filter((r) => r.status === "Approved" || r.status === "Paid").length;
  const disputed = periodRows.filter((r) => r.status === "Disputed").length;

  function approve(row: PayrollRow) {
    row.status = "Approved";
    setLocked((l) => ({ ...l, [row.id]: l[row.id] ?? false }));
  }

  function lock(row: PayrollRow) {
    setLocked((l) => ({ ...l, [row.id]: true }));
    row.status = "Paid";
  }

  const columns: Column<PayrollRow>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.employee}</p>
          <p className="text-xs text-muted-foreground">{r.role} · {r.id}</p>
        </div>
      ),
    },
    { key: "hours", header: "Hours", cell: (r) => <span className="tabular">{r.paidHours}h / {r.scheduledHours}h</span> },
    { key: "overtime", header: "OT", cell: (r) => <span className="tabular">{r.overtime}h</span> },
    { key: "base", header: "Base", cell: (r) => <span className="tabular">{currency(r.basePay)}</span>, align: "right" },
    { key: "commission", header: "Commission", cell: (r) => <span className="tabular">{currency(r.commission)}</span>, align: "right" },
    { key: "bonus", header: "Bonus", cell: (r) => <span className="tabular">{currency(r.bonus)}</span>, align: "right" },
    {
      key: "deductions",
      header: "Deductions",
      cell: (r) => (
        <div className="text-right">
          <p className="tabular text-destructive">-{currency(r.deductions)}</p>
          <p className="max-w-[14rem] truncate text-xs text-muted-foreground" title={noteFor(r)}>{noteFor(r)}</p>
        </div>
      ),
      align: "right",
    },
    { key: "net", header: "Net Pay", cell: (r) => <span className="tabular font-semibold text-foreground">{currency(r.net)}</span>, align: "right" },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={locked[r.id] ? "Paid" : r.status} /> },
    {
      key: "actions",
      header: "Actions",
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" disabled={r.status === "Paid" || locked[r.id]} onClick={() => approve(r)}>
            Approve
          </Button>
          <Button size="sm" variant="secondary" disabled={locked[r.id]} onClick={() => lock(r)}>
            <Lock className="size-3.5" /> Lock
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
        title="Payroll"
        description="Payroll register for the current pay period with attendance-driven deduction notes."
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-[13rem]">
              <SelectValue placeholder="Pay period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net payroll" value={currency(totalNet)} hint={period} icon={<Wallet className="size-4" />} tone="brand" />
        <StatCard label="Total deductions" value={currency(totalDeductions)} hint="attendance & benefits" icon={<Banknote className="size-4" />} tone="warning" />
        <StatCard label="Approved / locked" value={`${approvedCount} / ${periodRows.length}`} icon={<ShieldCheck className="size-4" />} tone="success" />
        <StatCard label="Disputed" value={disputed} hint="need review" tone="danger" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search employee…"
        filters={[
          { key: "status", label: "Status", options: unique(periodRows, (r) => r.status) },
          { key: "role", label: "Role", options: unique(periodRows, (r) => r.role) },
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
                <DialogTitle>Payslip — {selected.employee}</DialogTitle>
                <DialogDescription>{selected.period} · {selected.id}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Paid hours</span><span className="tabular">{selected.paidHours}h</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Overtime</span><span className="tabular">{selected.overtime}h</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Base pay</span><span className="tabular">{currency(selected.basePay)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Commission</span><span className="tabular">{currency(selected.commission)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bonus</span><span className="tabular">{currency(selected.bonus)}</span></div>
                <div className="flex justify-between text-destructive"><span>Deductions ({noteFor(selected)})</span><span className="tabular">-{currency(selected.deductions)}</span></div>
                <Separator />
                <div className="flex justify-between text-base font-semibold"><span>Net pay</span><span className="tabular">{currency(selected.net)}</span></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                <Button>Download PDF</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
