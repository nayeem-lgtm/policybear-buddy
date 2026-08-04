import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { policies, employees } from "@/lib/mock-data";
import { useFilters, unique, currency } from "@/lib/use-filters";
import { AlertTriangle, PhoneCall, LifeBuoy, TrendingDown, Megaphone } from "lucide-react";

export const Route = createFileRoute("/_shell/retention")({
  head: () => ({
    meta: [
      { title: "Retention & Save Desk — Policy Bear CRM" },
      { name: "description", content: "At-risk policy monitoring, save attempts, and win-back campaign tracking." },
      { property: "og:title", content: "Retention & Save Desk — Policy Bear CRM" },
      { property: "og:description", content: "At-risk policy monitoring, save attempts, and win-back campaign tracking." },
    ],
  }),
  component: RetentionPage,
});

interface AtRiskPolicy {
  id: string;
  policyNumber: string;
  customer: string;
  agent: string;
  carrier: string;
  premium: number;
  lapseReason: string;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  saveAttempts: number;
  lastAttempt: string;
  status: "Open" | "Save In Progress" | "Saved" | "Lost";
}

const lapseReasons = [
  "Payment failed",
  "Found cheaper plan",
  "Moved out of service area",
  "Dissatisfied with network",
  "No longer needs coverage",
  "Non-responsive",
];

const atRiskPolicies: AtRiskPolicy[] = policies.slice(0, 22).map((p, i) => ({
  id: `RSK-${5000 + i}`,
  policyNumber: p.policyNumber,
  customer: p.customer,
  agent: p.agent,
  carrier: p.carrier,
  premium: p.premium,
  lapseReason: lapseReasons[i % lapseReasons.length]!,
  riskLevel: (["Low", "Medium", "High", "Critical"] as const)[i % 4]!,
  saveAttempts: i % 4,
  lastAttempt: `2026-08-0${(i % 6) + 1}`,
  status: (["Open", "Save In Progress", "Saved", "Lost"] as const)[i % 4]!,
}));

const campaigns = [
  { name: "Payment Failure Recovery", target: 84, saved: 51, channel: "SMS + Call", tone: "success" as const },
  { name: "Rate Shock Win-Back", target: 60, saved: 22, channel: "Email + Call", tone: "warning" as const },
  { name: "Network Dissatisfaction Save", target: 36, saved: 9, channel: "Outbound Call", tone: "danger" as const },
];

function RetentionPage() {
  const { search, setSearch, values, setValue, reset, filtered } = useFilters(atRiskPolicies, {
    searchFields: (p) => [p.customer, p.policyNumber, p.agent, p.carrier],
    filters: {
      carrier: (p) => p.carrier,
      status: (p) => p.status,
      riskLevel: (p) => p.riskLevel,
    },
  });

  const stats = useMemo(() => {
    const atRisk = atRiskPolicies.filter((p) => p.status === "Open" || p.status === "Save In Progress").length;
    const saved = atRiskPolicies.filter((p) => p.status === "Saved").length;
    const premiumAtRisk = atRiskPolicies.reduce((s, p) => s + (p.status !== "Saved" ? p.premium : 0), 0);
    const critical = atRiskPolicies.filter((p) => p.riskLevel === "Critical").length;
    return { atRisk, saved, premiumAtRisk, critical };
  }, []);

  const columns: Column<AtRiskPolicy>[] = [
    { key: "policyNumber", header: "Policy #", cell: (p) => <span className="font-medium text-foreground">{p.policyNumber}</span> },
    { key: "customer", header: "Customer", cell: (p) => p.customer },
    { key: "agent", header: "Agent", cell: (p) => p.agent },
    { key: "carrier", header: "Carrier", cell: (p) => p.carrier },
    { key: "premium", header: "Premium", cell: (p) => currency(p.premium), align: "right" },
    { key: "lapseReason", header: "Lapse reason", cell: (p) => <span className="text-muted-foreground">{p.lapseReason}</span> },
    {
      key: "riskLevel",
      header: "Risk",
      cell: (p) => (
        <StatusBadge
          status={p.riskLevel}
          tone={p.riskLevel === "Critical" ? "danger" : p.riskLevel === "High" ? "warning" : p.riskLevel === "Medium" ? "info" : "muted"}
        />
      ),
    },
    { key: "saveAttempts", header: "Save attempts", cell: (p) => <span className="tabular">{p.saveAttempts}</span>, align: "center" },
    { key: "lastAttempt", header: "Last attempt", cell: (p) => p.lastAttempt },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="Retention & Save Desk"
        description="Monitor at-risk policies, log save attempts, and run structured win-back campaigns."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Policies at risk" value={stats.atRisk} tone="warning" icon={<AlertTriangle className="size-4" />} />
        <StatCard label="Saved this month" value={stats.saved} tone="success" icon={<LifeBuoy className="size-4" />} />
        <StatCard label="Premium at risk" value={currency(stats.premiumAtRisk)} tone="danger" icon={<TrendingDown className="size-4" />} />
        <StatCard label="Critical risk" value={stats.critical} tone="danger" icon={<PhoneCall className="size-4" />} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Win-back campaigns</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.name} className="p-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <Megaphone className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.channel}</p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold text-foreground">{c.saved}<span className="text-sm font-normal text-muted-foreground">/{c.target}</span></p>
                  <p className="text-xs text-muted-foreground">customers saved</p>
                </div>
                <Badge variant="outline">{Math.round((c.saved / c.target) * 100)}% success</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search policy #, customer, agent…"
        filters={[
          { key: "carrier", label: "Carrier", options: unique(atRiskPolicies, (p) => p.carrier) },
          { key: "status", label: "Status", options: unique(atRiskPolicies, (p) => p.status) },
          { key: "riskLevel", label: "Risk", options: unique(atRiskPolicies, (p) => p.riskLevel) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
        trailing={<Button size="sm" className="gap-1.5"><PhoneCall className="size-3.5" /> Log save attempt</Button>}
      />

      <DataTable columns={columns} rows={filtered} footer={`${filtered.length} of ${atRiskPolicies.length} at-risk policies`} />
    </div>
  );
}
