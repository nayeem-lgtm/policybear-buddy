import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Phone,
  Search as SearchIcon,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  calls,
  customers,
  documents,
  employees,
  policies,
} from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/search")({
  head: () => ({
    meta: [
      { title: "Global Search — Policy Bear CRM" },
      {
        name: "description",
        content: "Search across customers, policies, calls, employees, and documents.",
      },
      { property: "og:title", content: "Global Search — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Search across customers, policies, calls, employees, and documents.",
      },
    ],
  }),
  component: SearchPage,
});

type ResultType = "Customers" | "Policies" | "Calls" | "Employees" | "Documents";

const typeMeta: Record<ResultType, { icon: typeof Users; tone: string }> = {
  Customers: { icon: Users, tone: "text-brand" },
  Policies: { icon: ShieldCheck, tone: "text-success" },
  Calls: { icon: Phone, tone: "text-brand-teal" },
  Employees: { icon: UserRound, tone: "text-brand-tan" },
  Documents: { icon: FileText, tone: "text-muted-foreground" },
};

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  status?: string;
  meta: string;
}

function buildResults(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const c of customers) {
    const hay = `${c.name} ${c.phone} ${c.email} ${c.id}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        id: c.id,
        type: "Customers",
        title: c.name,
        subtitle: `${c.phone} · ${c.state}`,
        status: c.status,
        meta: `Agent: ${c.assignedAgent}`,
      });
    }
  }

  for (const p of policies) {
    const hay = `${p.customer} ${p.policyNumber} ${p.carrier} ${p.id}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        id: p.id,
        type: "Policies",
        title: p.policyNumber,
        subtitle: `${p.customer} · ${p.carrier}`,
        status: p.status,
        meta: `$${p.premium}/mo`,
      });
    }
  }

  for (const c of calls) {
    const hay = `${c.customer} ${c.callId} ${c.agent} ${c.id}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        id: c.id,
        type: "Calls",
        title: c.callId,
        subtitle: `${c.customer} · ${c.agent}`,
        status: c.qaStatus,
        meta: c.startedAt,
      });
    }
  }

  for (const e of employees) {
    const hay = `${e.name} ${e.email} ${e.id} ${e.team}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        id: e.id,
        type: "Employees",
        title: e.name,
        subtitle: `${e.title} · ${e.team}`,
        status: e.status,
        meta: e.email,
      });
    }
  }

  for (const d of documents) {
    const hay = `${d.name} ${d.category} ${d.owner}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        id: d.id,
        type: "Documents",
        title: d.name,
        subtitle: `${d.category} · ${d.owner}`,
        status: d.access,
        meta: d.updated,
      });
    }
  }

  return results;
}

const typeChips: ResultType[] = ["Customers", "Policies", "Calls", "Employees", "Documents"];

function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<ResultType>>(new Set());

  const results = useMemo(() => buildResults(query), [query]);
  const visible = useMemo(
    () => (activeTypes.size === 0 ? results : results.filter((r) => activeTypes.has(r.type))),
    [results, activeTypes],
  );

  const grouped = useMemo(() => {
    const map = new Map<ResultType, SearchResult[]>();
    for (const r of visible) {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    }
    return map;
  }, [visible]);

  function toggleType(t: ResultType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Global Search"
        description="Search customers, policies, calls, employees, and documents in one place."
      />

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search names, phone numbers, policy numbers, call IDs…"
          className="h-14 rounded-xl pl-12 text-base shadow-card"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {typeChips.map((t) => {
          const { icon: Icon } = typeMeta[t];
          const active = activeTypes.has(t);
          const count = results.filter((r) => r.type === t).length;
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-card text-muted-foreground hover:bg-surface",
              )}
            >
              <Icon className="size-3.5" />
              {t}
              {query.trim() && <Badge variant="secondary" className="ml-1 px-1.5 text-[0.65rem]">{count}</Badge>}
            </button>
          );
        })}
      </div>

      {!query.trim() && (
        <Card className="p-10 text-center text-sm text-muted-foreground shadow-card">
          Start typing to search across the CRM.
        </Card>
      )}

      {query.trim() && visible.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground shadow-card">
          No results for “{query}”.
        </Card>
      )}

      {Array.from(grouped.entries()).map(([type, rows]) => {
        const { icon: Icon, tone } = typeMeta[type];
        return (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={cn("size-4", tone)} />
              <p className="text-sm font-semibold text-foreground">{type}</p>
              <Badge variant="secondary">{rows.length}</Badge>
            </div>
            <Card className="gap-0 divide-y divide-border overflow-hidden p-0 shadow-card">
              {rows.slice(0, 8).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">{r.meta}</span>
                    {r.status && <StatusBadge status={r.status} />}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
