import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, PhoneCall, ShieldCheck, TrendingUp, Mail, Phone, MapPin, Home } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Timeline } from "@/components/crm/Timeline";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { customers, calls, policies, type Customer } from "@/lib/mock-data";
import { useFilters, unique } from "@/lib/use-filters";

export const Route = createFileRoute("/_shell/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Policy Bear CRM" },
      {
        name: "description",
        content: "Browse the customer book of record with contact info, call history and policies.",
      },
      { property: "og:title", content: "Customers — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Browse the customer book of record with contact info, call history and policies.",
      },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const [selected, setSelected] = useState<Customer | null>(null);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(customers, {
    searchFields: (r) => [r.name, r.phone, r.email, r.id],
    filters: {
      state: (r) => r.state,
      status: (r) => r.status,
      source: (r) => r.source,
      agent: (r) => r.assignedAgent,
    },
  });

  const stats = useMemo(() => {
    const active = customers.filter((c) => c.status === "Active Policy").length;
    const working = customers.filter((c) => ["Working", "Quoted", "Application Started"].includes(c.status)).length;
    const dnc = customers.filter((c) => c.status === "Do Not Call").length;
    return { total: customers.length, active, working, dnc };
  }, []);

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.id}</p>
        </div>
      ),
    },
    { key: "phone", header: "Phone", cell: (r) => r.phone },
    { key: "state", header: "State", cell: (r) => r.state },
    { key: "source", header: "Source", cell: (r) => r.source },
    { key: "agent", header: "Agent", cell: (r) => r.assignedAgent },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    { key: "policies", header: "Policies", cell: (r) => r.policies, align: "right" },
    { key: "lastContact", header: "Last Contact", cell: (r) => r.lastContact },
  ];

  const customerCalls = selected
    ? calls.filter((c) => c.customer === selected.name).slice(0, 6)
    : [];
  const customerPolicies = selected
    ? policies.filter((p) => p.customer === selected.name)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Customers"
        description="Full book of record across every lead source, agent and policy status."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Customers" value={stats.total} icon={<Users className="size-4" />} tone="brand" />
        <StatCard label="Active Policies" value={stats.active} icon={<ShieldCheck className="size-4" />} tone="success" />
        <StatCard label="In Pipeline" value={stats.working} icon={<TrendingUp className="size-4" />} tone="info" />
        <StatCard label="Do Not Call" value={stats.dnc} icon={<PhoneCall className="size-4" />} tone="danger" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customers by name, phone or ID…"
        filters={[
          { key: "state", label: "State", options: unique(customers, (r) => r.state) },
          { key: "status", label: "Status", options: unique(customers, (r) => r.status) },
          { key: "source", label: "Source", options: unique(customers, (r) => r.source) },
          { key: "agent", label: "Agent", options: unique(customers, (r) => r.assignedAgent) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} onRowClick={setSelected} footer={`${filtered.length} of ${customers.length} customers`} />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>{selected.id} · {selected.source}</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 px-4 pb-6">
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge status={selected.status} />
                  {selected.tags.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contact</p>
                  <div className="flex items-center gap-2 text-foreground"><Phone className="size-3.5 text-muted-foreground" />{selected.phone}</div>
                  <div className="flex items-center gap-2 text-foreground"><Mail className="size-3.5 text-muted-foreground" />{selected.email}</div>
                  <div className="flex items-center gap-2 text-foreground"><MapPin className="size-3.5 text-muted-foreground" />{selected.county} County, {selected.state}</div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Household</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-border p-2">
                      <p className="text-xs text-muted-foreground">Household size</p>
                      <p className="flex items-center gap-1 font-medium text-foreground"><Home className="size-3.5" />{selected.household}</p>
                    </div>
                    <div className="rounded-md border border-border p-2">
                      <p className="text-xs text-muted-foreground">Income</p>
                      <p className="font-medium text-foreground">{selected.income}</p>
                    </div>
                    <div className="rounded-md border border-border p-2">
                      <p className="text-xs text-muted-foreground">Date of birth</p>
                      <p className="font-medium text-foreground">{selected.dob}</p>
                    </div>
                    <div className="rounded-md border border-border p-2">
                      <p className="text-xs text-muted-foreground">Assigned agent</p>
                      <p className="font-medium text-foreground">{selected.assignedAgent}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Call history</p>
                  {customerCalls.length > 0 ? (
                    <Timeline
                      items={customerCalls.map((c) => ({
                        time: c.startedAt,
                        event: `${c.direction} call · ${c.disposition}`,
                        detail: `${c.duration} with ${c.agent}`,
                        ...(c.disposition === "Sale" ? { tone: "success" as const } : {}),
                      }))}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">No recorded calls yet.</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Policies</p>
                  {customerPolicies.length > 0 ? (
                    <div className="space-y-2">
                      {customerPolicies.map((p) => (
                        <div key={p.id} className="rounded-md border border-border p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground">{p.carrier} · {p.plan}</p>
                            <StatusBadge status={p.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">{p.policyNumber} · ${p.premium}/mo</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No policies on file.</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Notes</p>
                  <Textarea placeholder="Add a note about this customer…" className="text-sm" rows={3} />
                  <Button size="sm" variant="secondary">Save note</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
