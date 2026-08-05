import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Info, ShieldCheck, Wallet } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { useFilters, unique } from "@/lib/use-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  payrollWeeks,
  weekStarts,
  PAYROLL_TAX_RULE,
  money,
  type PayrollWeek,
} from "@/lib/company-data";

export const Route = createFileRoute("/_shell/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll — Policy Bear CRM" },
      { name: "description", content: "Weekly Gusto payroll register with base pay, taxes, and company cash outflow by agent." },
      { property: "og:title", content: "Payroll — Policy Bear CRM" },
      { property: "og:description", content: "Weekly Gusto payroll register with base pay, taxes, and company cash outflow by agent." },
    ],
  }),
  component: PayrollPage,
});

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PayrollPage() {
  const [week, setWeek] = useState(weekStarts[weekStarts.length - 1] ?? weekStarts[0]!);
  const [selected, setSelected] = useState<PayrollWeek | null>(null);

  const weekRows = useMemo(() => payrollWeeks.filter((r) => r.weekStart === week), [week]);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(weekRows, {
    searchFields: (r) => [r.agent, r.id],
    filters: { agent: (r) => r.agent },
  });

  const grossBaseDue = weekRows.reduce((s, r) => s + r.basePayroll, 0);
  const gustoOutflow = weekRows.reduce((s, r) => s + r.gustoOutflow, 0);
  const employerTaxes = weekRows.reduce((s, r) => s + r.employerTaxes, 0);
  const totalCompanyCost = weekRows.reduce((s, r) => s + r.totalCompanyCost, 0);

  const perAgentTotals = useMemo(() => {
    const map = new Map<string, { agent: string; base: number; commission: number; net: number; employerTaxes: number; totalCost: number; weeks: number }>();
    for (const r of payrollWeeks) {
      const cur = map.get(r.agent) ?? { agent: r.agent, base: 0, commission: 0, net: 0, employerTaxes: 0, totalCost: 0, weeks: 0 };
      cur.base += r.basePayroll;
      cur.commission += r.commissionDue + r.incentiveDue;
      cur.net += r.netPay;
      cur.employerTaxes += r.employerTaxes;
      cur.totalCost += r.totalCompanyCost;
      cur.weeks += 1;
      map.set(r.agent, cur);
    }
    return Array.from(map.values());
  }, []);

  const columns: Column<PayrollWeek>[] = [
    {
      key: "agent",
      header: "Agent",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.agent}</p>
          <p className="text-xs text-muted-foreground">{r.id}</p>
        </div>
      ),
    },
    { key: "rate", header: "Hourly Rate", cell: (r) => <span className="tabular">{money(r.hourlyRate)}</span>, align: "right" },
    { key: "hours", header: "Paid Hours", cell: (r) => <span className="tabular">{r.paidHours}h</span>, align: "right" },
    { key: "base", header: "Base Payroll Due", cell: (r) => <span className="tabular font-medium">{money(r.basePayroll)}</span>, align: "right" },
    { key: "baseStatus", header: "Base Status", cell: (r) => <StatusBadge status={r.baseStatus} /> },
    { key: "basePaidDate", header: "Base Paid Date", cell: (r) => fmtDate(r.basePaidDate) },
    {
      key: "employeeTaxes",
      header: "Employee Taxes (memo)",
      cell: (r) => <span className="tabular text-muted-foreground">{money(r.employeeTaxes)}</span>,
      align: "right",
    },
    { key: "employerTaxes", header: "Employer Taxes", cell: (r) => <span className="tabular text-warning">{money(r.employerTaxes)}</span>, align: "right" },
    { key: "netPay", header: "Net Pay to Employee", cell: (r) => <span className="tabular font-medium">{money(r.netPay)}</span>, align: "right" },
    { key: "taxesRemitted", header: "Taxes Remitted", cell: (r) => <span className="tabular">{money(r.taxesRemitted)}</span>, align: "right" },
    { key: "gustoOutflow", header: "Gusto Cash Outflow", cell: (r) => <span className="tabular font-semibold text-foreground">{money(r.gustoOutflow)}</span>, align: "right" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accounting"
        title="Payroll"
        description="Weekly Gusto payroll register: base pay, taxes, and company cash outflow by agent."
        actions={
          <Select value={week} onValueChange={setWeek}>
            <SelectTrigger className="h-9 w-[12rem]">
              <SelectValue placeholder="Week" />
            </SelectTrigger>
            <SelectContent>
              {weekStarts.map((w) => (
                <SelectItem key={w} value={w}>Week of {fmtDate(w)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross base due" value={money(grossBaseDue)} hint="selected week" icon={<Wallet className="size-4" />} tone="brand" />
        <StatCard label="Gusto cash outflow" value={money(gustoOutflow)} hint="net pay + employer taxes" icon={<Banknote className="size-4" />} tone="warning" />
        <StatCard label="Employer taxes" value={money(employerTaxes)} hint="additional company cost" icon={<ShieldCheck className="size-4" />} />
        <StatCard label="Total company cost" value={money(totalCompanyCost)} hint="incl. traffic + seats" tone="danger" />
      </div>

      <Card className="flex items-start gap-3 p-4 shadow-card">
        <Info className="mt-0.5 size-4 shrink-0 text-brand" />
        <p className="text-sm text-muted-foreground">{PAYROLL_TAX_RULE}</p>
      </Card>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search agent…"
        filters={[{ key: "agent", label: "Agent", options: unique(weekRows, (r) => r.agent) }]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} onRowClick={(r) => setSelected(r)} />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Per-agent totals (all weeks)</h3>
        <DataTable
          columns={[
            { key: "agent", header: "Agent", cell: (r) => <span className="font-medium text-foreground">{r.agent}</span> },
            { key: "weeks", header: "Weeks", cell: (r) => r.weeks, align: "right" },
            { key: "base", header: "Total Base", cell: (r) => <span className="tabular">{money(r.base)}</span>, align: "right" },
            { key: "commission", header: "Commission + Incentive", cell: (r) => <span className="tabular">{money(r.commission)}</span>, align: "right" },
            { key: "employerTaxes", header: "Employer Taxes", cell: (r) => <span className="tabular">{money(r.employerTaxes)}</span>, align: "right" },
            { key: "net", header: "Net Pay", cell: (r) => <span className="tabular font-medium">{money(r.net)}</span>, align: "right" },
            { key: "totalCost", header: "Total Company Cost", cell: (r) => <span className="tabular font-semibold">{money(r.totalCost)}</span>, align: "right" },
          ]}
          rows={perAgentTotals}
        />
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Weekly cost breakdown — {selected.agent}</DialogTitle>
                <DialogDescription>Week of {fmtDate(selected.weekStart)} · {selected.id}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Base payroll due</span><span className="tabular">{money(selected.basePayroll)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Commission due</span><span className="tabular">{money(selected.commissionDue)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Incentive due</span><span className="tabular">{money(selected.incentiveDue)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CallTools seat weekly cost</span><span className="tabular">{money(selected.callToolsWeekly)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ringba/CallGrid cost assigned</span><span className="tabular">{money(selected.trafficCost)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Other cost</span><span className="tabular">{money(selected.otherCost)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Employer taxes</span><span className="tabular">{money(selected.employerTaxes)}</span></div>
                <Separator />
                <div className="flex justify-between text-base font-semibold"><span>Total company cost</span><span className="tabular">{money(selected.totalCompanyCost)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Premium written</span><span className="tabular">{money(selected.premiumWritten)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Carrier revenue received</span><span className="tabular">{money(selected.carrierRevenue)}</span></div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Net cash position</span>
                  <span className={"tabular " + (selected.netCash < 0 ? "text-destructive" : "text-success")}>{money(selected.netCash)}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
