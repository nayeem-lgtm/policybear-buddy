import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Clock3,
  Contact,
  DollarSign,
  FileStack,
  Home,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  TrendingUp,
  User2,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Timeline } from "@/components/crm/Timeline";
import { DateRangeTabs, presetLabel, type DateSelection } from "@/components/crm/DateRangeTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { customers, calls, policies, type Customer } from "@/lib/mock-data";
import {
  sales,
  agentMaster,
  SALE_SOURCES,
  SALE_STATUSES,
  PAYMENT_STATUSES,
  QA_STATUSES,
  money,
  type SaleRecord,
} from "@/lib/company-data";
import {
  CAPTURED_CUSTOMERS_EVENT,
  loadCapturedCustomers,
  type CapturedCustomer,
} from "@/lib/captured-customers";
import { useFilters, unique } from "@/lib/use-filters";
import { inSelection } from "@/lib/date-range";
import { expectedCarrierRevenue, isRevenueCollected } from "@/lib/metrics-engine";

import { cn } from "@/lib/utils";

export type BookTab = "customers" | "sales";

function riskTone(risk: string | null) {
  if (!risk) return "neutral" as const;
  if (risk === "Preferred") return "success" as const;
  if (risk.includes("High")) return "danger" as const;
  return "warning" as const;
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-[0.7rem] font-semibold text-brand">
      {initials}
    </span>
  );
}

function Field({ icon, label, value }: { icon?: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/60 p-2.5">
      <p className="flex items-center gap-1 text-[0.68rem] font-semibold tracking-wide text-muted-foreground uppercase">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function CommissionPill({ eligible }: { eligible: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        eligible
          ? "border-success/30 bg-success/12 text-success"
          : "border-border text-muted-foreground",
      )}
    >
      <BadgeCheck className="size-3" />
      {eligible ? "Eligible" : "Not eligible"}
    </Badge>
  );
}

export function CustomerBook({
  tab,
  onTabChange,
}: {
  tab: BookTab;
  onTabChange: (tab: BookTab) => void;
}) {
  const [selection, setSelection] = useState<DateSelection>({ preset: "year" });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  /* ------------------------------------------------------------- date scoping */
  const scopedSales = useMemo(
    () => sales.filter((s) => inSelection(s.saleDate, selection)),
    [selection],
  );
  /* agent-captured customers (lead card / call script) merged in live */
  const [captured, setCaptured] = useState<CapturedCustomer[]>([]);
  useEffect(() => {
    const sync = () => setCaptured(loadCapturedCustomers());
    sync();
    window.addEventListener(CAPTURED_CUSTOMERS_EVENT, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(CAPTURED_CUSTOMERS_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const allCustomers = useMemo<Customer[]>(() => [...captured, ...customers], [captured]);

  const scopedCustomers = useMemo(
    () => allCustomers.filter((c) => inSelection(c.lastContact, selection)),
    [allCustomers, selection],
  );

  /** Sales rolled up per customer name so the customer view carries policy money. */
  const salesByCustomer = useMemo(() => {
    const map = new Map<string, SaleRecord[]>();
    for (const s of sales) {
      const list = map.get(s.customer) ?? [];
      list.push(s);
      map.set(s.customer, list);
    }
    return map;
  }, []);

  /* ------------------------------------------------------------------ filters */
  const custFilters = useFilters(scopedCustomers, {
    searchFields: (r) => [r.name, r.phone, r.email, r.id],
    filters: {
      state: (r) => r.state,
      status: (r) => r.status,
      source: (r) => r.source,
      agent: (r) => r.assignedAgent,
    },
  });

  const saleFilters = useFilters(scopedSales, {
    searchFields: (s) => [s.customer, s.phone ?? "", s.policyNumber ?? "", s.agent],
    filters: {
      agent: (s) => s.agent,
      source: (s) => s.source ?? "",
      saleStatus: (s) => s.saleStatus ?? "",
      paymentStatus: (s) => s.paymentStatus ?? "",
      paymentMethod: (s) => s.paymentMethod ?? "",
      qaStatus: (s) => s.qaStatus ?? "",
      publisher: (s) => s.publisher ?? "",
      state: (s) => s.state ?? "",
    },
  });

  /* -------------------------------------------------------------------- stats */
  const stats = useMemo(() => {
    const validSales = scopedSales.reduce((sum, s) => sum + s.countSale, 0);
    const premium = scopedSales.reduce((sum, s) => sum + s.premium, 0);
    const faceValue = scopedSales.reduce((sum, s) => sum + s.policyAmount, 0);
    const eligible = scopedSales.filter((s) => s.commissionEligible).length;
    const pendingPay = scopedSales.filter((s) => s.paymentStatus === "Pending First Payment").length;
    const activePolicies = scopedCustomers.filter((c) => c.status === "Active Policy").length;
    const pipeline = scopedCustomers.filter((c) =>
      ["Working", "Quoted", "Application Started", "New"].includes(c.status),
    ).length;
    return {
      validSales,
      premium,
      faceValue,
      eligible,
      pendingPay,
      activePolicies,
      pipeline,
      customers: scopedCustomers.length,
      sales: scopedSales.length,
    };
  }, [scopedSales, scopedCustomers]);

  /* ------------------------------------------------------------------ columns */
  const customerColumns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Initials name={r.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{r.name}</p>
            <p className="tabular truncate text-xs text-muted-foreground">{r.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Sale status",
      cell: (r) => {
        const latest = salesByCustomer.get(r.name)?.[0];
        return (
          <div className="space-y-1">
            <StatusBadge status={r.status} />
            {latest?.saleStatus && (
              <p className="text-xs text-muted-foreground">Policy · {latest.saleStatus}</p>
            )}
          </div>
        );
      },
    },
    {
      key: "policy",
      header: "Policy",
      cell: (r) => {
        const latest = salesByCustomer.get(r.name)?.[0];
        if (!latest) return <span className="text-muted-foreground">No policy</span>;
        return (
          <div>
            <p className="text-foreground">{latest.product ?? "—"} · {latest.carrier ?? "—"}</p>
            <p className="tabular text-xs text-muted-foreground">
              {latest.policyNumber ?? "Pending #"}
            </p>
          </div>
        );
      },
    },
    { key: "agent", header: "Agent", cell: (r) => r.assignedAgent },
    {
      key: "source",
      header: "Source",
      cell: (r) => (
        <div>
          <p>{r.source}</p>
          <p className="text-xs text-muted-foreground">{r.publisher}</p>
        </div>
      ),
    },
    { key: "state", header: "State", cell: (r) => r.state },
    {
      key: "premium",
      header: "Monthly premium",
      align: "right",
      cell: (r) => {
        const latest = salesByCustomer.get(r.name)?.[0];
        return latest ? <span className="tabular">{money(latest.premium)}</span> : "—";
      },
    },
    {
      key: "amount",
      header: "Policy amount",
      align: "right",
      cell: (r) => {
        const latest = salesByCustomer.get(r.name)?.[0];
        return latest ? <span className="tabular">{money(latest.policyAmount)}</span> : "—";
      },
    },
    {
      key: "payment",
      header: "Payment method",
      cell: (r) => {
        const latest = salesByCustomer.get(r.name)?.[0];
        return latest?.paymentMethod ? (
          <span className="text-xs">{latest.paymentMethod}</span>
        ) : (
          "—"
        );
      },
    },
    {
      key: "commission",
      header: "Commission",
      align: "center",
      cell: (r) => {
        const latest = salesByCustomer.get(r.name)?.[0];
        return latest ? <CommissionPill eligible={latest.commissionEligible} /> : "—";
      },
    },
    {
      key: "lastContact",
      header: "Date",
      cell: (r) => <span className="tabular text-muted-foreground">{r.lastContact}</span>,
    },
  ];

  const saleColumns: Column<SaleRecord>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <Initials name={s.customer} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{s.customer}</p>
            <p className="tabular truncate text-xs text-muted-foreground">{s.phone ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "saleStatus",
      header: "Sale status",
      cell: (s) => (
        <div className="space-y-1">
          {s.saleStatus ? <StatusBadge status={s.saleStatus} /> : "—"}
          {s.qaStatus && <p className="text-xs text-muted-foreground">QA · {s.qaStatus}</p>}
        </div>
      ),
    },
    {
      key: "policy",
      header: "Policy",
      cell: (s) => (
        <div>
          <p className="text-foreground">{s.product ?? "—"} · {s.carrier ?? "—"}</p>
          <p className="tabular text-xs text-muted-foreground">{s.policyNumber ?? "Pending #"}</p>
        </div>
      ),
    },
    { key: "agent", header: "Agent", cell: (s) => <span className="font-medium text-foreground">{s.agent}</span> },
    {
      key: "source",
      header: "Source",
      cell: (s) => (
        <div>
          <p>{s.source ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{s.publisher ?? "—"}</p>
        </div>
      ),
    },
    { key: "state", header: "State", cell: (s) => s.state ?? "—" },
    {
      key: "premium",
      header: "Monthly premium",
      align: "right",
      cell: (s) => <span className="tabular">{money(s.premium)}</span>,
    },
    {
      key: "policyAmount",
      header: "Policy amount",
      align: "right",
      cell: (s) => <span className="tabular">{money(s.policyAmount)}</span>,
    },
    {
      key: "paymentMethod",
      header: "Payment method",
      cell: (s) => (
        <div className="space-y-1">
          <p className="text-xs">{s.paymentMethod ?? "—"}</p>
          {s.paymentRisk && <StatusBadge status={s.paymentRisk} tone={riskTone(s.paymentRisk)} />}
        </div>
      ),
    },
    {
      key: "paymentStatus",
      header: "Payment status",
      cell: (s) => (s.paymentStatus ? <StatusBadge status={s.paymentStatus} /> : "—"),
    },
    {
      key: "commissionEligible",
      header: "Commission",
      align: "center",
      cell: (s) => <CommissionPill eligible={s.commissionEligible} />,
    },
    {
      key: "saleDate",
      header: "Date",
      cell: (s) => <span className="tabular text-muted-foreground">{s.saleDate}</span>,
    },
  ];

  const customerCalls = selectedCustomer
    ? calls.filter((c) => c.customer === selectedCustomer.name).slice(0, 6)
    : [];
  const customerPolicies = selectedCustomer
    ? policies.filter((p) => p.customer === selectedCustomer.name)
    : [];
  const customerSales = selectedCustomer ? (salesByCustomer.get(selectedCustomer.name) ?? []) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Book of business"
        title="Customers & Sales"
        description="One workspace for every customer record and the policy, payment and commission detail behind it."
        actions={
          <Tabs value={tab} onValueChange={(v) => onTabChange(v as BookTab)}>
            <TabsList>
              <TabsTrigger value="customers" className="gap-1.5">
                <Contact className="size-4" /> Customers
              </TabsTrigger>
              <TabsTrigger value="sales" className="gap-1.5">
                <FileStack className="size-4" /> Sales
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <Card className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-border/70 p-3 shadow-card">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Date range</span>
          <Badge variant="secondary" className="font-medium">{presetLabel(selection)}</Badge>
        </div>
        <DateRangeTabs value={selection} onChange={setSelection} />
      </Card>

      {tab === "customers" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Customers in range" value={stats.customers} icon={<Users className="size-4" />} tone="brand" />
          <StatCard label="Active policies" value={stats.activePolicies} icon={<ShieldCheck className="size-4" />} tone="success" />
          <StatCard label="In pipeline" value={stats.pipeline} icon={<TrendingUp className="size-4" />} tone="info" />
          <StatCard label="Premium written" value={money(stats.premium)} hint="Sales in range" icon={<DollarSign className="size-4" />} tone="warning" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Valid sales" value={stats.validSales} hint={`${stats.sales} records in range`} icon={<ShieldCheck className="size-4" />} tone="brand" />
          <StatCard label="Premium written" value={money(stats.premium)} hint="Monthly premium total" icon={<DollarSign className="size-4" />} tone="success" />
          <StatCard label="Policy face value" value={money(stats.faceValue)} hint="Coverage sold" icon={<TrendingUp className="size-4" />} tone="info" />
          <StatCard label="Commission eligible" value={stats.eligible} hint={`${stats.pendingPay} pending first payment`} icon={<Clock3 className="size-4" />} tone="warning" />
        </div>
      )}

      {tab === "customers" ? (
        <>
          <FilterBar
            search={custFilters.search}
            onSearchChange={custFilters.setSearch}
            searchPlaceholder="Search customers by name, phone or ID…"
            filters={[
              { key: "state", label: "State", options: unique(allCustomers, (r) => r.state) },
              { key: "status", label: "Status", options: unique(allCustomers, (r) => r.status) },
              { key: "source", label: "Source", options: unique(allCustomers, (r) => r.source) },
              { key: "agent", label: "Agent", options: unique(allCustomers, (r) => r.assignedAgent) },
            ]}
            values={custFilters.values}
            onChange={custFilters.setValue}
            onReset={custFilters.reset}
          />
          <DataTable
            columns={customerColumns}
            rows={custFilters.filtered}
            onRowClick={setSelectedCustomer}
            footer={`${custFilters.filtered.length} of ${scopedCustomers.length} customers · ${presetLabel(selection)}`}
          />
        </>
      ) : (
        <>
          <FilterBar
            search={saleFilters.search}
            onSearchChange={saleFilters.setSearch}
            searchPlaceholder="Search customer, phone, policy #…"
            filters={[
              { key: "agent", label: "Agent", options: agentMaster.map((a) => a.name) },
              { key: "source", label: "Source", options: [...SALE_SOURCES] },
              { key: "saleStatus", label: "Sale status", options: [...SALE_STATUSES] },
              { key: "paymentStatus", label: "Payment status", options: [...PAYMENT_STATUSES] },
              { key: "paymentMethod", label: "Payment method", options: unique(sales, (s) => s.paymentMethod ?? "") },
              { key: "qaStatus", label: "QA status", options: [...QA_STATUSES] },
              { key: "publisher", label: "Publisher", options: unique(sales, (s) => s.publisher ?? "") },
              { key: "state", label: "State", options: unique(sales, (s) => s.state ?? "") },
            ]}
            values={saleFilters.values}
            onChange={saleFilters.setValue}
            onReset={saleFilters.reset}
          />
          <DataTable
            columns={saleColumns}
            rows={saleFilters.filtered}
            onRowClick={setSelectedSale}
            footer={`${saleFilters.filtered.length} of ${scopedSales.length} sales · ${presetLabel(selection)}`}
          />
        </>
      )}

      {/* customer detail */}
      <Sheet open={!!selectedCustomer} onOpenChange={(o) => !o && setSelectedCustomer(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedCustomer && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedCustomer.name}</SheetTitle>
                <SheetDescription>
                  {selectedCustomer.id} · {selectedCustomer.source}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge status={selectedCustomer.status} />
                  {selectedCustomer.tags.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field icon={<Phone className="size-3" />} label="Phone" value={selectedCustomer.phone} />
                  <Field icon={<Mail className="size-3" />} label="Email" value={selectedCustomer.email} />
                  <Field icon={<MapPin className="size-3" />} label="Location" value={`${selectedCustomer.county} County, ${selectedCustomer.state}`} />
                  <Field icon={<User2 className="size-3" />} label="Agent" value={selectedCustomer.assignedAgent} />
                  <Field icon={<Home className="size-3" />} label="Household" value={selectedCustomer.household} />
                  <Field label="Income" value={selectedCustomer.income} />
                  <Field label="Date of birth" value={selectedCustomer.dob} />
                  <Field label="Last contact" value={selectedCustomer.lastContact} />
                  <Field label="Publisher" value={selectedCustomer.publisher} />
                  <Field label="Campaign" value={selectedCustomer.campaign} />
                </div>

                {customerSales.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Sales &amp; commission
                      </p>
                      {customerSales.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setSelectedSale(s);
                          }}
                          className="w-full rounded-lg border border-border/70 p-2.5 text-left transition-colors hover:bg-accent"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {s.product ?? "—"} · {money(s.premium)}/mo
                            </p>
                            <CommissionPill eligible={s.commissionEligible} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {s.saleDate} · {s.agent} · {s.paymentStatus ?? "—"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </>
                )}

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

                {customerPolicies.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Policies</p>
                      {customerPolicies.map((p) => (
                        <div key={p.id} className="rounded-lg border border-border/70 p-2.5 text-sm">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground">{p.carrier} · {p.plan}</p>
                            <StatusBadge status={p.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">{p.policyNumber} · ${p.premium}/mo</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

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

      {/* sale detail */}
      <Sheet open={!!selectedSale} onOpenChange={(o) => !o && setSelectedSale(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedSale && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedSale.customer}</SheetTitle>
                <SheetDescription>{selectedSale.id} · {selectedSale.saleDate}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                <div className="flex flex-wrap gap-1.5">
                  {selectedSale.saleStatus && <StatusBadge status={selectedSale.saleStatus} />}
                  {selectedSale.paymentStatus && <StatusBadge status={selectedSale.paymentStatus} />}
                  {selectedSale.qaStatus && <StatusBadge status={selectedSale.qaStatus} />}
                  <CommissionPill eligible={selectedSale.commissionEligible} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field icon={<User2 className="size-3" />} label="Agent" value={selectedSale.agent} />
                  <Field icon={<Phone className="size-3" />} label="Phone" value={selectedSale.phone ?? "—"} />
                  <Field icon={<MapPin className="size-3" />} label="State" value={selectedSale.state ?? "—"} />
                  <Field label="Source" value={selectedSale.source ?? "—"} />
                  <Field label="Product" value={selectedSale.product ?? "—"} />
                  <Field label="Carrier" value={selectedSale.carrier ?? "—"} />
                  <Field label="Policy number" value={selectedSale.policyNumber ?? "Pending"} />
                  <Field label="Policy start" value={selectedSale.policyStart ?? "—"} />
                  <Field label="Policy amount" value={money(selectedSale.policyAmount)} />
                  <Field label="Monthly premium" value={money(selectedSale.premium)} />
                  <Field label="Payment method" value={selectedSale.paymentMethod ?? "—"} />
                  <Field label="Draft date" value={selectedSale.draftDate ?? "—"} />
                  <Field label="Carrier revenue" value={money(expectedCarrierRevenue(selectedSale))} />
                  <Field
                    label="Revenue status"
                    value={isRevenueCollected(selectedSale) ? "Collected" : "Receivable"}
                  />
                  <Field label="Personal lead incentive" value={money(selectedSale.personalLeadIncentive)} />
                  <Field label="Publisher" value={selectedSale.publisher ?? "—"} />
                </div>

                {selectedSale.notes && (
                  <>
                    <Separator />
                    <p className="text-sm text-muted-foreground">{selectedSale.notes}</p>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
