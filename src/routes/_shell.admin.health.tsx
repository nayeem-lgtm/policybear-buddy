import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertTriangle, Gauge, Server } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Timeline } from "@/components/crm/Timeline";
import { Card } from "@/components/ui/card";
import { integrations, incidents } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/admin/health")({
  head: () => ({
    meta: [
      { title: "System Health — Policy Bear CRM" },
      {
        name: "description",
        content: "Uptime, latency, error rates, queue backlog and incident feed for connected systems.",
      },
      { property: "og:title", content: "System Health — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Uptime, latency, error rates, queue backlog and incident feed for connected systems.",
      },
    ],
  }),
  component: SystemHealthPage,
});

const uptimeTiles = integrations.map((i, idx) => ({
  name: i.name,
  uptime: i.status === "Connected" ? 99.9 - (idx % 3) * 0.05 : i.status === "Degraded" ? 97.2 : 0,
  status: i.status,
}));

const latency = [
  { name: "CallTools API", ms: 142 },
  { name: "HealthSherpa API", ms: 310 },
  { name: "Carrier Quote API", ms: 480 },
  { name: "Payline API", ms: 620 },
  { name: "Ringba API", ms: 96 },
];

const errorRate = [
  { name: "CallTools", rate: 0.2 },
  { name: "HealthSherpa", rate: 0.6 },
  { name: "Carrier Quote API", rate: 0.1 },
  { name: "Payline", rate: 3.4 },
  { name: "Ringba", rate: 0.0 },
];

const queueBacklog = [
  { queue: "Enrollment submissions", depth: 12, sla: "under" },
  { queue: "Commission recalculation", depth: 46, sla: "at-risk" },
  { queue: "Recording upload retry", depth: 4, sla: "under" },
  { queue: "Webhook redelivery", depth: 88, sla: "breach" },
];

function SystemHealthPage() {
  const recent = incidents
    .filter((i) => i.category === "Technical" || i.category === "Vendor")
    .slice(0, 6)
    .map((i) => ({
      time: i.reportedAt,
      event: i.title,
      detail: `${i.severity} · ${i.status} · owner ${i.assignedTo}`,
      tone:
        i.status === "Resolved" || i.status === "Closed"
          ? ("success" as const)
          : i.severity === "Critical"
            ? ("danger" as const)
            : ("warning" as const),
    }));

  const avgUptime = uptimeTiles.reduce((s, t) => s + t.uptime, 0) / uptimeTiles.length;
  const avgErrorRate = errorRate.reduce((s, e) => s + e.rate, 0) / errorRate.length;
  const totalBacklog = queueBacklog.reduce((s, q) => s + q.depth, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="System Health"
        description="Live snapshot of API uptime, latency, error rates and queue backlog."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Avg uptime" value={`${avgUptime.toFixed(2)}%`} tone="success" icon={<Server className="size-4" />} />
        <StatCard label="Avg error rate" value={`${avgErrorRate.toFixed(1)}%`} tone={avgErrorRate > 1 ? "warning" : "default"} icon={<AlertTriangle className="size-4" />} />
        <StatCard label="Queue backlog" value={totalBacklog} tone="warning" icon={<Gauge className="size-4" />} />
        <StatCard label="Open incidents" value={incidents.filter((i) => i.status === "Open" || i.status === "Investigating").length} tone="danger" icon={<Activity className="size-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4 shadow-card">
          <p className="mb-3 text-sm font-semibold text-foreground">Uptime by integration</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {uptimeTiles.map((t) => (
              <div key={t.name} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {t.uptime > 0 ? `${t.uptime.toFixed(2)}%` : "—"}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 shadow-card">
          <p className="mb-3 text-sm font-semibold text-foreground">Latency (p50, ms)</p>
          <div className="space-y-2.5">
            {latency.map((l) => (
              <div key={l.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{l.name}</span>
                  <span className="tabular text-muted-foreground">{l.ms}ms</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      "h-full rounded-full " + (l.ms > 500 ? "bg-destructive" : l.ms > 250 ? "bg-warning" : "bg-success")
                    }
                    style={{ width: `${Math.min(100, (l.ms / 700) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 shadow-card">
          <p className="mb-3 text-sm font-semibold text-foreground">Error rate</p>
          <div className="space-y-2.5">
            {errorRate.map((e) => (
              <div key={e.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{e.name}</span>
                <StatusBadge status={e.rate > 2 ? "High" : e.rate > 0.5 ? "Medium" : "Low"} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 shadow-card">
          <p className="mb-3 text-sm font-semibold text-foreground">Queue backlog</p>
          <div className="space-y-2.5">
            {queueBacklog.map((q) => (
              <div key={q.queue} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{q.queue}</span>
                <div className="flex items-center gap-2">
                  <span className="tabular text-muted-foreground">{q.depth}</span>
                  <StatusBadge
                    status={q.sla === "breach" ? "Overdue" : q.sla === "at-risk" ? "Pending" : "Active"}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold text-foreground">Incident feed</p>
        <Timeline items={recent} />
      </Card>
    </div>
  );
}
