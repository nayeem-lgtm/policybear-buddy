import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CircleDollarSign,
  Plus,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { DateRangeTabs, presetLabel, type DateSelection } from "@/components/crm/DateRangeTabs";
import { inSelection } from "@/lib/date-range";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { COST_CATEGORIES, money, type PayableRow } from "@/lib/company-data";
import {
  addExpense,
  isManualExpense,
  removeExpense,
  setExpenseStatus,
  useExpenseLedger,
} from "@/lib/expense-store";

const MEMO_CATEGORIES = new Set(["Employee Tax Withheld (Memo)", "Employer Taxes"]);
const MANUAL_CATEGORIES = COST_CATEGORIES.filter((c) => !MEMO_CATEGORIES.has(c));
const STATUS_OPTIONS = ["Payable", "Paid", "Hold", "Not Due"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function SectionHead({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">{icon}</span>
      <div>
        <p className="text-[0.7rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground/80">{subtitle}</p>}
      </div>
    </div>
  );
}

export function ExpenseCenter() {
  const ledger = useExpenseLedger();
  const [sel, setSel] = useState<DateSelection>({ preset: "year" });
  const [selected, setSelected] = useState<PayableRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  // new-expense form
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState<string>(MANUAL_CATEGORIES[0] ?? "Other Expense");
  const [amount, setAmount] = useState("");
  const [costDate, setCostDate] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [status, setStatus] = useState("Payable");
  const [notes, setNotes] = useState("");

  const scoped = useMemo(
    () => ledger.filter((r) => inSelection(r.costDate ?? `${r.month}-01`, sel)),
    [ledger, sel],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((r) => {
      if (q && ![r.vendor, r.id, r.notes ?? "", r.category].some((f) => f.toLowerCase().includes(q))) return false;
      if (values.category && r.category !== values.category) return false;
      if (values.status && r.status !== values.status) return false;
      if (values.vendor && r.vendor !== values.vendor) return false;
      if (values.source && (values.source === "Manual") !== isManualExpense(r.id)) return false;
      return true;
    });
  }, [scoped, search, values]);

  const cashRows = useMemo(() => scoped.filter((r) => !MEMO_CATEGORIES.has(r.category)), [scoped]);
  const totalSpend = cashRows.reduce((s, r) => s + r.amount, 0);
  const paid = cashRows.filter((r) => r.status === "Paid").reduce((s, r) => s + r.amount, 0);
  const outstanding = cashRows.filter((r) => r.status !== "Paid").reduce((s, r) => s + r.amount, 0);
  const manualTotal = cashRows.filter((r) => isManualExpense(r.id)).reduce((s, r) => s + r.amount, 0);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of cashRows) map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
    return MANUAL_CATEGORIES.map((c) => ({ category: c, amount: map.get(c) ?? 0 })).sort((a, b) => b.amount - a.amount);
  }, [cashRows]);
  const maxCategory = Math.max(...categoryBreakdown.map((c) => c.amount), 1);

  const topVendors = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of cashRows) map.set(r.vendor, (map.get(r.vendor) ?? 0) + r.amount);
    return [...map.entries()].map(([vendor, amount]) => ({ vendor, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6);
  }, [cashRows]);

  function resetForm() {
    setVendor("");
    setCategory(MANUAL_CATEGORIES[0] ?? "Other Expense");
    setAmount("");
    setCostDate(today());
    setDueDate(today());
    setStatus("Payable");
    setNotes("");
  }

  function submitExpense() {
    const value = Number(amount);
    if (!vendor.trim()) {
      toast.error("Add a vendor or description");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const row = addExpense({
      vendor: vendor.trim(),
      category,
      amount: value,
      costDate,
      dueDate,
      status,
      notes: notes.trim() || null,
    });
    toast.success(`${row.vendor} — ${money(row.amount)} added to company finance`);
    setAddOpen(false);
    resetForm();
  }

  const columns: Column<PayableRow>[] = [
    {
      key: "vendor",
      header: "Expense",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.vendor}</p>
          <p className="truncate text-xs text-muted-foreground">
            {r.id}
            {isManualExpense(r.id) ? " · manual" : ""}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (r) => (
        <Badge variant="outline" className="whitespace-nowrap text-xs font-normal">
          {r.category}
          {MEMO_CATEGORIES.has(r.category) ? " (memo)" : ""}
        </Badge>
      ),
    },
    { key: "costDate", header: "Date", cell: (r) => r.costDate ?? r.month },
    { key: "amount", header: "Amount", cell: (r) => <span className="tabular font-semibold">{money(r.amount)}</span>, align: "right" },
    { key: "dueDate", header: "Due", cell: (r) => r.dueDate ?? "—" },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "paidDate", header: "Paid", cell: (r) => r.paidDate ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Expenses"
        description="Log company spending manually and see it flow straight into the company finance cost stack."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeTabs value={sel} onChange={setSel} />
        <Button onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="size-4" /> Add expense
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total spend" value={money(totalSpend)} hint={presetLabel(sel)} icon={<Wallet className="size-4" />} tone="brand" />
        <StatCard label="Paid" value={money(paid)} icon={<CircleDollarSign className="size-4" />} tone="success" />
        <StatCard label="Outstanding" value={money(outstanding)} hint="not yet paid" icon={<CalendarClock className="size-4" />} tone="warning" />
        <StatCard label="Manually logged" value={money(manualTotal)} hint="added by your team" icon={<Receipt className="size-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 rounded-2xl p-4 shadow-card lg:col-span-2">
          <SectionHead icon={<AlertCircle className="size-4" />} title="Cost stack" subtitle="Cash spend by category" />
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

        <Card className="space-y-3 rounded-2xl p-4 shadow-card">
          <SectionHead icon={<Receipt className="size-4" />} title="Top vendors" subtitle={presetLabel(sel)} />
          <div className="space-y-2">
            {topVendors.length === 0 && <p className="text-sm text-muted-foreground">No spend in this period.</p>}
            {topVendors.map((v) => (
              <div key={v.vendor} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-muted-foreground">{v.vendor}</span>
                <span className="tabular font-medium text-foreground">{money(v.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search vendor, category or notes…"
        filters={[
          { key: "category", label: "Category", options: [...new Set(scoped.map((r) => r.category))] },
          { key: "status", label: "Status", options: [...new Set(scoped.map((r) => r.status))] },
          { key: "vendor", label: "Vendor", options: [...new Set(scoped.map((r) => r.vendor))] },
          { key: "source", label: "Source", options: ["Manual", "System"] },
        ]}
        values={values}
        onChange={(key, value) => setValues((p) => ({ ...p, [key]: value }))}
        onReset={() => {
          setValues({});
          setSearch("");
        }}
      />

      <DataTable columns={columns} rows={filtered} onRowClick={(r) => setSelected(r)} empty="No expenses for this filter." />

      {/* add expense */}
      <Dialog open={addOpen} onOpenChange={(o) => (o ? setAddOpen(true) : (setAddOpen(false), resetForm()))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
            <DialogDescription>This is posted to the company finance cost stack immediately.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exp-vendor">Vendor / description</Label>
              <Input id="exp-vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Ringba top-up" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MANUAL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Amount (USD)</Label>
              <Input id="exp-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Expense date</Label>
              <Input id="exp-date" type="date" value={costDate} onChange={(e) => setCostDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-due">Due date</Label>
              <Input id="exp-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exp-notes">Notes</Label>
              <Textarea id="exp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional context for accounting" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={submitExpense}>Add to finance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* detail */}
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
                <div className="flex justify-between"><span className="text-muted-foreground">Expense date</span><span>{selected.costDate ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Due date</span><span>{selected.dueDate ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid date</span><span>{selected.paidDate ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={selected.status} /></div>
                <Separator />
                <p className="text-xs text-muted-foreground">{selected.notes ?? "No notes."}</p>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                {isManualExpense(selected.id) && (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => { removeExpense(selected.id); setSelected(null); toast.success("Expense removed"); }}
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                )}
                <Button variant="outline" disabled={selected.status === "Hold"} onClick={() => { setExpenseStatus(selected.id, "Hold"); setSelected({ ...selected, status: "Hold" }); }}>Hold</Button>
                <Button
                  disabled={selected.status === "Paid"}
                  onClick={() => {
                    setExpenseStatus(selected.id, "Paid");
                    setSelected({ ...selected, status: "Paid", paidDate: today() });
                  }}
                >
                  Mark paid
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
