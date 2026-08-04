import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { policies, employees, type Policy } from "@/lib/mock-data";
import { useFilters, unique, currency } from "@/lib/use-filters";
import { PlusCircle, DollarSign, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/sales")({
  head: () => ({
    meta: [
      { title: "Sales & Policies — Policy Bear CRM" },
      { name: "description", content: "Policy book of business with carrier, agent, and commission tracking." },
      { property: "og:title", content: "Sales & Policies — Policy Bear CRM" },
      { property: "og:description", content: "Policy book of business with carrier, agent, and commission tracking." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const [selected, setSelected] = useState<Policy | null>(null);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(policies, {
    searchFields: (p) => [p.customer, p.policyNumber, p.agent, p.carrier],
    filters: {
      carrier: (p) => p.carrier,
      status: (p) => p.status,
      agent: (p) => p.agent,
      month: (p) => p.effectiveDate.slice(0, 7),
    },
  });

  const stats = useMemo(() => {
    const active = policies.filter((p) => p.status === "Active" || p.status === "Effectuated").length;
    const commission = policies.reduce((s, p) => s + p.commission, 0);
    const premium = policies.reduce((s, p) => s + p.premium, 0);
    const agents = new Set(policies.map((p) => p.agent)).size;
    return { active, commission, premium, agents };
  }, []);

  const columns: Column<Policy>[] = [
    { key: "policyNumber", header: "Policy #", cell: (p) => <span className="font-medium text-foreground">{p.policyNumber}</span> },
    { key: "customer", header: "Customer", cell: (p) => p.customer },
    { key: "agent", header: "Agent", cell: (p) => p.agent },
    { key: "carrier", header: "Carrier", cell: (p) => p.carrier },
    { key: "plan", header: "Plan", cell: (p) => <span className="text-muted-foreground">{p.plan}</span> },
    { key: "premium", header: "Premium", cell: (p) => currency(p.premium), align: "right" },
    { key: "commission", header: "Commission", cell: (p) => <span className="font-medium text-success">{currency(p.commission)}</span>, align: "right" },
    { key: "effectiveDate", header: "Effective", cell: (p) => p.effectiveDate },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="Sales & Policies"
        description="Full policy book of business across carriers, agents, and effective months."
        actions={
          <Link to="/sales/new">
            <Button size="sm" className="gap-1.5"><PlusCircle className="size-4" /> New Application</Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active policies" value={stats.active} tone="success" icon={<ShieldCheck className="size-4" />} />
        <StatCard label="Total commission" value={currency(stats.commission)} tone="brand" icon={<DollarSign className="size-4" />} />
        <StatCard label="Total premium" value={currency(stats.premium)} tone="info" icon={<TrendingUp className="size-4" />} />
        <StatCard label="Writing agents" value={stats.agents} icon={<Users className="size-4" />} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search policy #, customer, agent…"
        filters={[
          { key: "carrier", label: "Carrier", options: unique(policies, (p) => p.carrier) },
          { key: "status", label: "Status", options: unique(policies, (p) => p.status) },
          { key: "agent", label: "Agent", options: unique(policies, (p) => p.agent) },
          { key: "month", label: "Effective Month", options: unique(policies, (p) => p.effectiveDate.slice(0, 7)) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} onRowClick={setSelected} footer={`${filtered.length} of ${policies.length} policies`} />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.policyNumber}</SheetTitle>
                <SheetDescription>{selected.customer} · {selected.carrier}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <StatusBadge status={selected.paymentStatus} />
                  <StatusBadge status={selected.qaStatus} />
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Agent</p><p className="font-medium text-foreground">{selected.agent}</p></div>
                  <div><p className="text-xs text-muted-foreground">Plan</p><p className="font-medium text-foreground">{selected.plan}</p></div>
                  <div><p className="text-xs text-muted-foreground">Plan type</p><p className="font-medium text-foreground">{selected.planType}</p></div>
                  <div><p className="text-xs text-muted-foreground">Members</p><p className="font-medium text-foreground">{selected.members}</p></div>
                  <div><p className="text-xs text-muted-foreground">Premium</p><p className="font-medium text-foreground">{currency(selected.premium)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Subsidy</p><p className="font-medium text-foreground">{currency(selected.subsidy)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Commission</p><p className="font-medium text-success">{currency(selected.commission)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Effective date</p><p className="font-medium text-foreground">{selected.effectiveDate}</p></div>
                  <div><p className="text-xs text-muted-foreground">Submitted</p><p className="font-medium text-foreground">{selected.submittedAt}</p></div>
                  <div><p className="text-xs text-muted-foreground">Source</p><p className="font-medium text-foreground">{selected.source}</p></div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
