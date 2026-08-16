import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Clock, Search, Ticket } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { EscalationDetailSheet } from "@/components/crm/EscalationDetailSheet";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ESCALATION_RISKS,
  ESCALATION_STATUSES,
  escalations,
  riskTone,
  statusTone,
  type Escalation,
} from "@/lib/escalations";

export const Route = createFileRoute("/_shell/qa/escalations")({
  head: () => ({
    meta: [
      { title: "Escalations — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Track publisher escalation tickets: topic, risk level, status and resolution comments in one place.",
      },
      { property: "og:title", content: "Escalations — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Track publisher escalation tickets, risk levels, status and resolution notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EscalationsPage,
});

function EscalationsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [risk, setRisk] = useState("all");
  const [selected, setSelected] = useState<Escalation | null>(null);
  const [open, setOpen] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return escalations.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (risk !== "all" && e.risk !== risk) return false;
      if (!q) return true;
      return [String(e.id), e.campaign, e.publisher, e.topic, e.callerId]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [query, status, risk]);

  const stats = useMemo(
    () => ({
      total: escalations.length,
      open: escalations.filter((e) => e.status === "OPEN").length,
      progress: escalations.filter((e) => e.status === "IN_PROGRESS").length,
      resolved: escalations.filter((e) => e.status === "RESOLVED" || e.status === "CLOSED").length,
      high: escalations.filter((e) => e.risk === "High Risk").length,
    }),
    [],
  );

  const cards = [
    { label: "Total tickets", value: stats.total, icon: Ticket, tone: "text-primary bg-primary/10" },
    { label: "Open", value: stats.open, icon: Clock, tone: "text-amber-600 bg-amber-500/12" },
    {
      label: "High risk",
      value: stats.high,
      icon: AlertTriangle,
      tone: "text-destructive bg-destructive/10",
    },
    {
      label: "Resolved",
      value: stats.resolved,
      icon: CheckCircle2,
      tone: "text-emerald-600 bg-emerald-500/12",
    },
  ];

  const openTicket = (e: Escalation) => {
    setSelected(e);
    setOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Escalations"
        description="Every publisher dispute, quality flag and fraud report — tracked end to end."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="flex items-center gap-3 p-4">
            <span className={cn("grid size-10 place-items-center rounded-xl", c.tone)}>
              <c.icon className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </p>
              <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Escalation tickets</h2>
            <Badge variant="secondary">{visible.length}</Badge>
          </div>
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search caller ID, ticket, topic, campaign…"
              className="h-9 rounded-full pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
              {ESCALATION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Risk: All</SelectItem>
              {ESCALATION_RISKS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ul className="divide-y">
          {visible.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => openTicket(e)}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-xs font-semibold tabular-nums">
                  #{e.id}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.topic}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.campaign} · {e.publisher}
                  </p>
                </div>
                <span className="hidden w-40 truncate text-xs text-muted-foreground md:block">
                  {e.callerId}
                </span>
                <span
                  className={cn(
                    "hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold sm:inline-block",
                    riskTone[e.risk],
                  )}
                >
                  {e.risk}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    statusTone[e.status],
                  )}
                >
                  {e.status}
                </span>
              </button>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-4 py-12 text-center text-sm text-muted-foreground">
              No escalations match these filters.
            </li>
          )}
        </ul>
      </Card>

      <EscalationDetailSheet escalation={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
