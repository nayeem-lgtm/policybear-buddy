import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, PhoneCall, Radio, Timer } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  publisherCps,
  campaignCps,
  payrollWeeks,
  payables,
  money,
  type CpsRow,
} from "@/lib/company-data";

export const Route = createFileRoute("/_shell/call-costs")({
  head: () => ({
    meta: [
      { title: "Call Costs — Policy Bear CRM" },
      { name: "description", content: "Ringba/CallGrid traffic cost control: cost per sale by publisher and campaign, payout vs. valid sales, and per-agent cost assignment." },
      { property: "og:title", content: "Call Costs — Policy Bear CRM" },
      { property: "og:description", content: "Ringba/CallGrid traffic cost control: cost per sale by publisher and campaign, payout vs. valid sales, and per-agent cost assignment." },
    ],
  }),
  component: CallCostsPage,
});

const CPS_TARGET = 150;

function fmtWeek(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CpsTable({ rows }: { rows: CpsRow[] }) {
  const columns: Column<CpsRow>[] = [
    {
      key: "name",
      header: "Name",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{r.name}</span>
          {r.cps > CPS_TARGET && <StatusBadge status="Over Target" tone="danger" />}
        </div>
      ),
    },
    { key: "converted", header: "Converted Calls", cell: (r) => <span className="tabular">{r.converted}</span>, align: "right" },
    { key: "validSales", header: "Valid Sales", cell: (r) => <span className="tabular">{r.validSales}</span>, align: "right" },
    {
      key: "cps",
      header: "Cost / Sale (CPS)",
      cell: (r) => <span className={`tabular font-medium ${r.cps > CPS_TARGET ? "text-destructive" : "text-foreground"}`}>{money(r.cps)}</span>,
      align: "right",
    },
    { key: "payout", header: "Payout", cell: (r) => <span className="tabular">{money(r.payout)}</span>, align: "right" },
    { key: "revenue", header: "Revenue Billed", cell: (r) => <span className="tabular">{money(r.revenue)}</span>, align: "right" },
  ];
  return <DataTable columns={columns} rows={[...rows].sort((a, b) => b.cps - a.cps)} />;
}

function CallCostsPage() {
  const [tab, setTab] = useState("publisher");

  const overTarget = publisherCps.filter((p) => p.cps > CPS_TARGET);
  const totalPayout = publisherCps.reduce((s, p) => s + p.payout, 0);
  const totalValidSales = publisherCps.reduce((s, p) => s + p.validSales, 0);
  const blendedCps = totalValidSales > 0 ? totalPayout / totalValidSales : 0;
  const trafficPayables = payables.filter((p) => p.category === "Ringba/CallGrid").reduce((s, p) => s + p.amount, 0);

  const agentWeekCost = useMemo(
    () =>
      payrollWeeks.map((r) => ({
        id: r.id,
        agent: r.agent,
        weekStart: r.weekStart,
        trafficCost: r.trafficCost,
        validSales: r.validSales,
        costPerSale: r.validSales > 0 ? r.trafficCost / r.validSales : 0,
      })),
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accounting"
        title="Call Costs"
        description="Ringba/CallGrid traffic cost control. Billing rule: paid after 120 seconds. Cost per sale (CPS) by publisher, campaign, and agent-week."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Blended CPS" value={money(blendedCps)} hint={`across ${totalValidSales} valid sales`} icon={<PhoneCall className="size-4" />} tone="brand" />
        <StatCard label="Total traffic payout" value={money(totalPayout)} hint="publisher payouts" icon={<Radio className="size-4" />} />
        <StatCard label="Ringba/CallGrid payables" value={money(trafficPayables)} hint="from payables ledger" icon={<Timer className="size-4" />} tone="warning" />
        <StatCard label="Publishers over target" value={overTarget.length} hint={`CPS > ${money(CPS_TARGET)}`} icon={<AlertTriangle className="size-4" />} tone="danger" />
      </div>

      {overTarget.length > 0 && (
        <Card className="flex items-start gap-3 p-4 shadow-card">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{overTarget.map((p) => p.name).join(", ")}</span> {overTarget.length > 1 ? "are" : "is"} above
            the {money(CPS_TARGET)} cost-per-sale target — review traffic quality or renegotiate payout before continuing spend.
          </p>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="publisher">By Publisher</TabsTrigger>
          <TabsTrigger value="campaign">By Campaign</TabsTrigger>
          <TabsTrigger value="agent">By Agent-Week</TabsTrigger>
        </TabsList>
        <TabsContent value="publisher" className="mt-4">
          <CpsTable rows={publisherCps} />
        </TabsContent>
        <TabsContent value="campaign" className="mt-4">
          <CpsTable rows={campaignCps} />
        </TabsContent>
        <TabsContent value="agent" className="mt-4">
          <DataTable
            columns={[
              { key: "agent", header: "Agent", cell: (r) => <span className="font-medium text-foreground">{r.agent}</span> },
              { key: "week", header: "Week", cell: (r) => `Week of ${fmtWeek(r.weekStart)}` },
              { key: "validSales", header: "Valid Sales", cell: (r) => <span className="tabular">{r.validSales}</span>, align: "right" },
              { key: "trafficCost", header: "Traffic Cost Assigned", cell: (r) => <span className="tabular font-medium">{money(r.trafficCost)}</span>, align: "right" },
              {
                key: "costPerSale",
                header: "Cost / Sale",
                cell: (r) => (
                  <span className={`tabular ${r.costPerSale > CPS_TARGET ? "text-destructive font-medium" : ""}`}>
                    {r.validSales > 0 ? money(r.costPerSale) : "—"}
                  </span>
                ),
                align: "right",
              },
            ]}
            rows={agentWeekCost}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
