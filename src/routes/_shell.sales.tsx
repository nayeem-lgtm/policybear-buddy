import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useFilters, unique } from "@/lib/use-filters";
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
import { DollarSign, ShieldCheck, TrendingUp, Clock3, User2, Phone, MapPin, FileText } from "lucide-react";

export const Route = createFileRoute("/_shell/sales")({
  head: () => ({
    meta: [
      { title: "Sales & Policies — Policy Bear CRM" },
      { name: "description", content: "Full policy register with agent, source, payment and QA status for every Policy Bear sale." },
      { property: "og:title", content: "Sales & Policies — Policy Bear CRM" },
      { property: "og:description", content: "Full policy register with agent, source, payment and QA status for every Policy Bear sale." },
    ],
  }),
  component: SalesPage,
});

function riskTone(risk: string | null) {
  if (!risk) return "neutral" as const;
  if (risk === "Preferred") return "success" as const;
  if (risk.includes("High")) return "danger" as const;
  return "warning" as const;
}

function SalesPage() {
  const [view, setView] = useState<"all" | "personal">("all");
  const [selected, setSelected] = useState<SaleRecord | null>(null);

  const scoped = useMemo(
    () => sales.filter((s) => (view === "personal" ? s.source === "Personal Lead" : true)),
    [view],
  );

  const publishers = useMemo(() => unique(sales, (s) => s.publisher ?? "Unknown"), []);
  const states = useMemo(() => unique(sales, (s) => s.state ?? "Unknown"), []);
  const agents = useMemo(() => agentMaster.map((a) => a.name), []);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(scoped, {
    searchFields: (s) => [s.customer, s.phone ?? "", s.policyNumber ?? ""],
    filters: {
      agent: (s) => s.agent,
      source: (s) => s.source ?? "",
      saleStatus: (s) => s.saleStatus ?? "",
      paymentStatus: (s) => s.paymentStatus ?? "",
      qaStatus: (s) => s.qaStatus ?? "",
      publisher: (s) => s.publisher ?? "",
      state: (s) => s.state ?? "",
    },
  });

  const stats = useMemo(() => {
    const validSales = sales.reduce((sum, s) => sum + s.countSale, 0);
    const premiumWritten = sales.reduce((sum, s) => sum + s.premium, 0);
    const avgPremium = sales.length ? premiumWritten / sales.length : 0;
    const pendingFirstPayment = sales.filter((s) => s.paymentStatus === "Pending First Payment").length;
    return { validSales, premiumWritten, avgPremium, pendingFirstPayment };
  }, []);

  const columns: Column<SaleRecord>[] = [
    { key: "saleDate", header: "Sale Date", cell: (s) => <span className="text-muted-foreground">{s.saleDate}</span> },
    { key: "agent", header: "Agent", cell: (s) => <span className="font-medium text-foreground">{s.agent}</span> },
    {
      key: "customer",
      header: "Customer",
      cell: (s) => (
        <div>
          <div className="font-medium text-foreground">{s.customer}</div>
          <div className="text-xs text-muted-foreground">{s.phone ?? "—"}</div>
        </div>
      ),
    },
    { key: "state", header: "State", cell: (s) => s.state ?? "—" },
    {
      key: "product",
      header: "Product / Carrier",
      cell: (s) => (
        <div>
          <div>{s.product ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{s.carrier ?? "—"}</div>
        </div>
      ),
    },
    { key: "policyAmount", header: "Policy Amount", align: "right", cell: (s) => money(s.policyAmount) },
    { key: "premium", header: "Monthly Premium", align: "right", cell: (s) => money(s.premium) },
    {
      key: "paymentMethod",
      header: "Payment Method",
      cell: (s) => (
        <div className="space-y-1">
          <div className="text-xs">{s.paymentMethod ?? "—"}</div>
          {s.paymentRisk && <StatusBadge status={s.paymentRisk} tone={riskTone(s.paymentRisk)} />}
        </div>
      ),
    },
    { key: "paymentStatus", header: "Payment Status", cell: (s) => (s.paymentStatus ? <StatusBadge status={s.paymentStatus} /> : "—") },
    { key: "qaStatus", header: "QA Status", cell: (s) => (s.qaStatus ? <StatusBadge status={s.qaStatus} /> : "—") },
    { key: "publisher", header: "Publisher", cell: (s) => <span className="text-xs">{s.publisher ?? "—"}</span> },
    {
      key: "commissionEligible",
      header: "Commission",
      align: "center",
      cell: (s) => (
        <Badge variant="outline" className={s.commissionEligible ? "border-success/25 bg-success/12 text-success" : "border-border text-muted-foreground"}>
          {s.commissionEligible ? "Eligible" : "Not eligible"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="Sales & Policies"
        description="Live register of every issued sale, its payment/QA state, and Ringba/publisher attribution."
        actions={
          <Tabs value={view} onValueChange={(v) => setView(v as "all" | "personal")}>
            <TabsList>
              <TabsTrigger value="all">All sales</TabsTrigger>
              <TabsTrigger value="personal">Personal leads</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Valid Sales" value={stats.validSales} hint="Sum of countSale across all records" icon={<ShieldCheck className="size-4" />} tone="brand" />
        <StatCard label="Premium Written" value={money(stats.premiumWritten)} hint="Sum of monthly premium" icon={<DollarSign className="size-4" />} tone="success" />
        <StatCard label="Average Premium" value={money(stats.avgPremium)} hint="Per policy" icon={<TrendingUp className="size-4" />} tone="info" />
        <StatCard label="Pending First Payment" value={stats.pendingFirstPayment} hint="Awaiting draft/first posting" icon={<Clock3 className="size-4" />} tone="warning" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customer, phone, policy #…"
        filters={[
          { key: "agent", label: "Agent", options: agents },
          { key: "source", label: "Source", options: [...SALE_SOURCES] },
          { key: "saleStatus", label: "Sale Status", options: [...SALE_STATUSES] },
          { key: "paymentStatus", label: "Payment Status", options: [...PAYMENT_STATUSES] },
          { key: "qaStatus", label: "QA Status", options: [...QA_STATUSES] },
          { key: "publisher", label: "Publisher", options: publishers },
          { key: "state", label: "State", options: states },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={(row) => setSelected(row)}
        footer={<span>{filtered.length} of {scoped.length} sales shown</span>}
      />

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.customer}</SheetTitle>
                <SheetDescription>{selected.id} · {selected.saleDate}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field icon={<User2 className="size-3.5" />} label="Agent" value={selected.agent} />
                  <Field icon={<Phone className="size-3.5" />} label="Phone" value={selected.phone ?? "—"} />
                  <Field icon={<MapPin className="size-3.5" />} label="State" value={selected.state ?? "—"} />
                  <Field label="Source" value={selected.source ?? "—"} />
                  <Field label="Product" value={selected.product ?? "—"} />
                  <Field label="Carrier" value={selected.carrier ?? "—"} />
                  <Field label="Policy Number" value={selected.policyNumber ?? "Pending"} />
                  <Field label="Policy Start" value={selected.policyStart ?? "—"} />
                  <Field label="Draft Date" value={selected.draftDate ?? "—"} />
                  <Field label="Policy Amount" value={money(selected.policyAmount)} />
                  <Field label="Monthly Premium" value={money(selected.premium)} />
                  <Field label="Carrier Revenue" value={money(selected.carrierRevenue)} />
                  <Field label="Revenue Received" value={selected.revenueReceived} />
                  <Field label="Personal Lead Incentive" value={money(selected.personalLeadIncentive)} />
                  <Field label="Ringba Target" value={selected.target ?? "—"} />
                  <Field label="Publisher" value={selected.publisher ?? "—"} />
                </div>

                <Separator />

                <div className="flex flex-wrap gap-2">
                  {selected.saleStatus && <StatusBadge status={selected.saleStatus} />}
                  {selected.paymentStatus && <StatusBadge status={selected.paymentStatus} />}
                  {selected.qaStatus && <StatusBadge status={selected.qaStatus} />}
                  {selected.paymentRisk && <StatusBadge status={selected.paymentRisk} tone={riskTone(selected.paymentRisk)} />}
                  <Badge variant="outline" className={selected.commissionEligible ? "border-success/25 bg-success/12 text-success" : "border-border text-muted-foreground"}>
                    {selected.commissionEligible ? "Commission eligible" : "Not commission eligible"}
                  </Badge>
                  {selected.callbackConverted && <Badge variant="outline" className="border-brand/25 bg-brand/10 text-brand">Callback converted</Badge>}
                </div>

                {selected.notes && (
                  <div className="rounded-md border border-border bg-surface/60 p-3 text-sm">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase">
                      <FileText className="size-3.5" /> Notes
                    </div>
                    <p className="text-foreground">{selected.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase">{icon}{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}
