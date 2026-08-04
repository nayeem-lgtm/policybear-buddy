import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeDollarSign, Gavel, TrendingUp, Users } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { useFilters, unique, currency } from "@/lib/use-filters";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { employees, policies, chargebacks } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/commissions")({
  head: () => ({
    meta: [
      { title: "Commissions — Policy Bear CRM" },
      { name: "description", content: "Agent commission statements with rate tiers, clawbacks, and payout status." },
      { property: "og:title", content: "Commissions — Policy Bear CRM" },
      { property: "og:description", content: "Agent commission statements with rate tiers, clawbacks, and payout status." },
    ],
  }),
  component: CommissionsPage,
});

interface Statement {
  id: string;
  agent: string;
  period: string;
  policiesCount: number;
  tier: string;
  rate: string;
  grossCommission: number;
  clawbacks: number;
  netPayout: number;
  status: "Pending" | "Approved" | "Paid" | "Disputed";
}

function tierFor(count: number) {
  if (count >= 8) return { tier: "Tier 3 — Elite", rate: "18%" };
  if (count >= 5) return { tier: "Tier 2 — Growth", rate: "14%" };
  return { tier: "Tier 1 — Standard", rate: "10%" };
}

const agentNames = Array.from(new Set(policies.map((p) => p.agent))).slice(0, 14);

const statements: Statement[] = agentNames.map((agent, i) => {
  const agentPolicies = policies.filter((p) => p.agent === agent);
  const count = agentPolicies.length;
  const { tier, rate } = tierFor(count);
  const gross = agentPolicies.reduce((s, p) => s + p.commission, 0);
  const clawbacks = chargebacks
    .filter((c) => c.agent === agent)
    .reduce((s, c) => s + c.amount, 0);
  return {
    id: `STM-${6100 + i}`,
    agent,
    period: "Aug 1 – Aug 15, 2026",
    policiesCount: count,
    tier,
    rate,
    grossCommission: gross,
    clawbacks,
    netPayout: Math.max(gross - clawbacks, 0),
    status: (["Pending", "Approved", "Paid", "Disputed"] as const)[i % 4]!,
  };
});

function CommissionsPage() {
  const [rows, setRows] = useState(statements);
  const [selected, setSelected] = useState<Statement | null>(null);
  const [disputeNote, setDisputeNote] = useState("");

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(rows, {
    searchFields: (r) => [r.agent, r.id],
    filters: { status: (r) => r.status, tier: (r) => r.tier },
  });

  const totalPayout = rows.reduce((s, r) => s + r.netPayout, 0);
  const totalClawbacks = rows.reduce((s, r) => s + r.clawbacks, 0);
  const paid = rows.filter((r) => r.status === "Paid").length;
  const disputed = rows.filter((r) => r.status === "Disputed").length;

  function dispute(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Disputed" } : r)));
    setSelected((s) => (s && s.id === id ? { ...s, status: "Disputed" } : s));
    setDisputeNote("");
  }

  const columns: Column<Statement>[] = [
    {
      key: "agent",
      header: "Agent",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.agent}</p>
          <p className="text-xs text-muted-foreground">{r.id} · {r.period}</p>
        </div>
      ),
    },
    { key: "policies", header: "Policies", cell: (r) => <span className="tabular">{r.policiesCount}</span>, align: "center" },
    { key: "tier", header: "Rate tier", cell: (r) => <span>{r.tier} ({r.rate})</span> },
    { key: "gross", header: "Gross", cell: (r) => <span className="tabular">{currency(r.grossCommission)}</span>, align: "right" },
    { key: "clawbacks", header: "Clawbacks", cell: (r) => <span className="tabular text-destructive">-{currency(r.clawbacks)}</span>, align: "right" },
    { key: "net", header: "Net payout", cell: (r) => <span className="tabular font-semibold text-foreground">{currency(r.netPayout)}</span>, align: "right" },
    { key: "status", header: "Payout status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Commissions"
        description="Per-agent commission statements with rate tiers, clawback deductions, and payout status."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net payouts" value={currency(totalPayout)} hint="current period" icon={<BadgeDollarSign className="size-4" />} tone="brand" />
        <StatCard label="Clawbacks" value={currency(totalClawbacks)} icon={<TrendingUp className="size-4" />} tone="warning" />
        <StatCard label="Statements paid" value={`${paid} / ${rows.length}`} icon={<Users className="size-4" />} tone="success" />
        <StatCard label="Disputed" value={disputed} icon={<Gavel className="size-4" />} tone="danger" />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search agent…"
        filters={[
          { key: "status", label: "Status", options: unique(rows, (r) => r.status) },
          { key: "tier", label: "Tier", options: unique(rows, (r) => r.tier) },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} onRowClick={(r) => setSelected(r)} />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-md">
          {selected && (
            <div className="flex h-full flex-col">
              <SheetHeader>
                <SheetTitle>{selected.agent}</SheetTitle>
                <SheetDescription>{selected.id} · {selected.period}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Policies counted</span><span className="tabular">{selected.policiesCount}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Rate tier</span><span>{selected.tier} ({selected.rate})</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Gross commission</span><span className="tabular">{currency(selected.grossCommission)}</span></div>
                  <div className="flex justify-between text-destructive"><span>Clawbacks</span><span className="tabular">-{currency(selected.clawbacks)}</span></div>
                  <Separator />
                  <div className="flex justify-between text-base font-semibold"><span>Net payout</span><span className="tabular">{currency(selected.netPayout)}</span></div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Tier progress</p>
                  <Progress value={Math.min((selected.policiesCount / 8) * 100, 100)} />
                  <p className="mt-1 text-xs text-muted-foreground">{selected.policiesCount} of 8 policies to next tier</p>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Dispute this statement</p>
                  <Textarea
                    placeholder="Describe the discrepancy…"
                    value={disputeNote}
                    onChange={(e) => setDisputeNote(e.target.value)}
                  />
                  <Button
                    className="mt-2 w-full"
                    variant="outline"
                    disabled={selected.status === "Disputed"}
                    onClick={() => dispute(selected.id)}
                  >
                    <Gavel className="size-4" /> Submit dispute
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
