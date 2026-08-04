import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Scale, CheckCircle2, AlertTriangle, DollarSign } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { calls, type CallRecord } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/call-reconciliation")({
  head: () => ({
    meta: [
      { title: "Call Reconciliation — Policy Bear CRM" },
      {
        name: "description",
        content: "Match CRM call records against carrier and publisher billing to resolve variances.",
      },
      { property: "og:title", content: "Call Reconciliation — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Match CRM call records against carrier and publisher billing to resolve variances.",
      },
    ],
  }),
  component: CallReconciliationPage,
});

interface BillingRecord {
  billingId: string;
  callId: string | null;
  publisher: string;
  customer: string;
  billedSeconds: number;
  billedCost: string;
}

const billingRecords: BillingRecord[] = calls.map((c, i) => {
  // introduce variance / unmatched records for realism
  const dropped = i % 13 === 6;
  const variance = i % 7 === 2;
  return {
    billingId: `BILL-${610000 + i * 9}`,
    callId: dropped ? null : c.callId,
    publisher: c.publisher,
    customer: c.customer,
    billedSeconds: variance ? c.billableSeconds + 45 : c.billableSeconds,
    billedCost: variance
      ? `$${(Number(c.cost.replace("$", "")) + 6).toFixed(2)}`
      : c.cost,
  };
});

// extra publisher-side records with no CRM counterpart at all
const extraBillingOnly: BillingRecord[] = [
  { billingId: "BILL-899901", callId: null, publisher: "BlueRock Media", customer: "Unlinked Caller", billedSeconds: 210, billedCost: "$18.00" },
  { billingId: "BILL-899902", callId: null, publisher: "Sunbelt Direct", customer: "Unlinked Caller", billedSeconds: 95, billedCost: "$9.50" },
  { billingId: "BILL-899903", callId: null, publisher: "Vertex Ads", customer: "Unlinked Caller", billedSeconds: 340, billedCost: "$24.00" },
];

const allBilling = [...billingRecords, ...extraBillingOnly];

function CallReconciliationPage() {
  const [reconciled, setReconciled] = useState<Set<string>>(new Set());

  const unmatchedCrm = useMemo(() => calls.filter((c) => !c.matched), []);
  const unmatchedBilling = useMemo(() => allBilling.filter((b) => !b.callId), []);
  const matchedPairs = useMemo(() => {
    return calls
      .filter((c) => c.matched)
      .map((c) => {
        const bill = billingRecords.find((b) => b.callId === c.callId);
        const crmCost = Number(c.cost.replace("$", ""));
        const billCost = bill ? Number(bill.billedCost.replace("$", "")) : crmCost;
        return {
          call: c,
          bill,
          variance: +(billCost - crmCost).toFixed(2),
        };
      })
      .filter((row) => !reconciled.has(row.call.callId));
  }, [reconciled]);

  const stats = useMemo(() => {
    const totalVariance = matchedPairs.reduce((a, r) => a + Math.abs(r.variance), 0);
    const flagged = matchedPairs.filter((r) => Math.abs(r.variance) > 0).length;
    return {
      unmatchedCrm: unmatchedCrm.length,
      unmatchedBilling: unmatchedBilling.length,
      flagged,
      totalVariance,
    };
  }, [matchedPairs, unmatchedCrm, unmatchedBilling]);

  const handleReconcile = (callId: string) => {
    setReconciled((prev) => new Set(prev).add(callId));
    toast.success(`Call ${callId} reconciled`);
  };

  const crmColumns: Column<CallRecord>[] = [
    { key: "callId", header: "Call ID", cell: (r) => r.callId },
    { key: "customer", header: "Customer", cell: (r) => r.customer },
    { key: "publisher", header: "Publisher", cell: (r) => r.publisher },
    { key: "cost", header: "CRM Cost", cell: (r) => r.cost, align: "right" },
  ];

  const billingColumns: Column<BillingRecord>[] = [
    { key: "billingId", header: "Billing ID", cell: (r) => r.billingId },
    { key: "customer", header: "Customer", cell: (r) => r.customer },
    { key: "publisher", header: "Publisher", cell: (r) => r.publisher },
    { key: "billedCost", header: "Billed Cost", cell: (r) => r.billedCost, align: "right" },
  ];

  const matchedColumns: Column<(typeof matchedPairs)[number]>[] = [
    {
      key: "call",
      header: "Call",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.call.callId}</p>
          <p className="text-xs text-muted-foreground">{r.call.customer}</p>
        </div>
      ),
    },
    { key: "publisher", header: "Publisher", cell: (r) => r.call.publisher },
    { key: "crmCost", header: "CRM Cost", cell: (r) => r.call.cost, align: "right" },
    { key: "billedCost", header: "Billed Cost", cell: (r) => r.bill?.billedCost ?? r.call.cost, align: "right" },
    {
      key: "variance",
      header: "Variance",
      align: "right",
      cell: (r) =>
        r.variance === 0 ? (
          <span className="text-success">$0.00</span>
        ) : (
          <span className="text-destructive">${r.variance.toFixed(2)}</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.variance === 0 ? "Valid" : "Disputed"} />,
    },
    {
      key: "action",
      header: "",
      align: "right",
      cell: (r) => (
        <Button size="sm" variant="secondary" onClick={() => handleReconcile(r.call.callId)}>
          Reconcile
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Call Reconciliation"
        description="Match CRM call logs against carrier and publisher billing feeds to resolve cost variances."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unmatched CRM Calls" value={stats.unmatchedCrm} icon={<AlertTriangle className="size-4" />} tone="warning" />
        <StatCard label="Unmatched Billing" value={stats.unmatchedBilling} icon={<AlertTriangle className="size-4" />} tone="danger" />
        <StatCard label="Flagged Variances" value={stats.flagged} icon={<Scale className="size-4" />} tone="info" />
        <StatCard label="Total Variance" value={`$${stats.totalVariance.toFixed(2)}`} icon={<DollarSign className="size-4" />} tone="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Unmatched CRM calls</p>
          <DataTable columns={crmColumns} rows={unmatchedCrm} empty="Every CRM call has a billing match." />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Unmatched publisher billing</p>
          <DataTable columns={billingColumns} rows={unmatchedBilling} empty="Every billing record has a CRM match." />
        </div>
      </div>

      <Card className="gap-0 overflow-hidden p-0 shadow-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <CheckCircle2 className="size-4 text-brand" />
          <div>
            <p className="text-sm font-semibold text-foreground">Matched calls awaiting review</p>
            <p className="text-xs text-muted-foreground">CRM cost vs publisher-billed cost.</p>
          </div>
        </div>
        <DataTable columns={matchedColumns} rows={matchedPairs} empty="All matched calls have been reconciled." />
      </Card>
    </div>
  );
}
