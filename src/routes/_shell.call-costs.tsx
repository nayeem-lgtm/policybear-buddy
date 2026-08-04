import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, TrendingDown, TrendingUp, Undo2 } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Card } from "@/components/ui/card";
import { calls, publishers, chargebacks } from "@/lib/mock-data";
import { currency, unique } from "@/lib/use-filters";

export const Route = createFileRoute("/_shell/call-costs")({
  head: () => ({
    meta: [
      { title: "Cost & Returns — Policy Bear CRM" },
      {
        name: "description",
        content: "Cost per call and lead by publisher, refund requests, and CPA vs revenue comparisons.",
      },
      { property: "og:title", content: "Cost & Returns — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Cost per call and lead by publisher, refund requests, and CPA vs revenue comparisons.",
      },
    ],
  }),
  component: CallCostsPage,
});

interface PublisherCost {
  publisher: string;
  campaigns: string[];
  calls: number;
  totalCost: number;
  costPerCall: number;
  revenue: number;
  cpa: number;
}

function CallCostsPage() {
  const publisherCosts: PublisherCost[] = useMemo(() => {
    return unique(calls, (c) => c.publisher).map((pub) => {
      const pubCalls = calls.filter((c) => c.publisher === pub);
      const totalCost = pubCalls.reduce((a, c) => a + Number(c.cost.replace("$", "")), 0);
      const sales = pubCalls.filter((c) => c.disposition === "Sale").length;
      const info = publishers.find((p) => p.name.startsWith(pub));
      const revenue = info?.revenue ?? sales * 480;
      return {
        publisher: pub,
        campaigns: unique(pubCalls, (c) => c.campaign),
        calls: pubCalls.length,
        totalCost,
        costPerCall: totalCost / pubCalls.length,
        revenue,
        cpa: sales > 0 ? totalCost / sales : totalCost,
      };
    });
  }, []);

  const refunds = useMemo(
    () =>
      chargebacks.slice(0, 8).map((c) => ({
        id: c.id,
        customer: c.customer,
        carrier: c.carrier,
        amount: c.amount,
        reason: c.reason,
        status: c.status,
        month: c.month,
      })),
    [],
  );

  const stats = useMemo(() => {
    const totalCost = publisherCosts.reduce((a, p) => a + p.totalCost, 0);
    const totalRevenue = publisherCosts.reduce((a, p) => a + p.revenue, 0);
    const avgCpc = totalCost / calls.length;
    const pendingRefunds = chargebacks.filter((c) => c.status === "Pending").length;
    return { totalCost, totalRevenue, avgCpc, pendingRefunds };
  }, [publisherCosts]);

  const maxScale = Math.max(...publisherCosts.map((p) => Math.max(p.cpa, p.revenue / Math.max(1, p.calls))), 1);

  const columns: Column<PublisherCost>[] = [
    {
      key: "publisher",
      header: "Publisher",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.publisher}</p>
          <p className="text-xs text-muted-foreground">{r.campaigns.join(", ")}</p>
        </div>
      ),
    },
    { key: "calls", header: "Calls", cell: (r) => r.calls, align: "right" },
    { key: "totalCost", header: "Total Cost", cell: (r) => currency(r.totalCost), align: "right" },
    { key: "costPerCall", header: "Cost / Call", cell: (r) => currency(r.costPerCall, 2), align: "right" },
    { key: "cpa", header: "CPA", cell: (r) => currency(r.cpa), align: "right" },
    { key: "revenue", header: "Revenue", cell: (r) => currency(r.revenue), align: "right" },
  ];

  const refundColumns: Column<(typeof refunds)[number]>[] = [
    { key: "id", header: "ID", cell: (r) => r.id },
    { key: "customer", header: "Customer", cell: (r) => r.customer },
    { key: "carrier", header: "Carrier", cell: (r) => r.carrier },
    { key: "reason", header: "Reason", cell: (r) => r.reason },
    { key: "amount", header: "Amount", cell: (r) => currency(r.amount), align: "right" },
    { key: "month", header: "Month", cell: (r) => r.month },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Cost & Returns"
        description="Cost per call and lead by publisher and campaign, refund activity, and CPA vs revenue."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Lead Cost" value={currency(stats.totalCost)} icon={<DollarSign className="size-4" />} tone="brand" />
        <StatCard label="Total Revenue" value={currency(stats.totalRevenue)} icon={<TrendingUp className="size-4" />} tone="success" />
        <StatCard label="Avg Cost / Call" value={currency(stats.avgCpc, 2)} icon={<TrendingDown className="size-4" />} tone="info" />
        <StatCard label="Pending Refunds" value={stats.pendingRefunds} icon={<Undo2 className="size-4" />} tone="warning" />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Cost per call/lead by publisher &amp; campaign</p>
        <DataTable columns={columns} rows={publisherCosts} />
      </div>

      <Card className="gap-3 p-4 shadow-card">
        <p className="text-sm font-semibold text-foreground">CPA vs revenue per call</p>
        <p className="text-xs text-muted-foreground">Comparing acquisition cost against average revenue generated, per publisher.</p>
        <div className="space-y-3 pt-2">
          {publisherCosts.map((p) => {
            const revenuePerCall = p.revenue / Math.max(1, p.calls);
            return (
              <div key={p.publisher} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{p.publisher}</span>
                  <span className="text-muted-foreground">
                    CPA {currency(p.cpa)} · Rev/call {currency(revenuePerCall, 2)}
                  </span>
                </div>
                <div className="flex h-2.5 gap-1">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-destructive/70"
                      style={{ width: `${Math.min(100, (p.cpa / maxScale) * 100)}%` }}
                    />
                  </div>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-success"
                      style={{ width: `${Math.min(100, (revenuePerCall / maxScale) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-destructive/70" /> CPA</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-success" /> Revenue / call</span>
        </div>
      </Card>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Returns &amp; refund requests</p>
        <DataTable columns={refundColumns} rows={refunds} />
      </div>
    </div>
  );
}
