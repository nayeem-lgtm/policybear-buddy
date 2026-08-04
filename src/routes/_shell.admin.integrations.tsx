import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, Plug, Webhook } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { integrations } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/admin/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Policy Bear CRM" },
      {
        name: "description",
        content: "Manage connected systems, API keys, sync status and webhooks.",
      },
      { property: "og:title", content: "Integrations — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Manage connected systems, API keys, sync status and webhooks.",
      },
    ],
  }),
  component: IntegrationsAdminPage,
});

const webhooks = [
  { id: "WH-1", url: "https://hooks.policybear.com/calltools/events", event: "call.completed", status: "Active" },
  { id: "WH-2", url: "https://hooks.policybear.com/healthsherpa/enroll", event: "enrollment.submitted", status: "Active" },
  { id: "WH-3", url: "https://hooks.policybear.com/payline/txn", event: "payment.failed", status: "Paused" },
];

function IntegrationsAdminPage() {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const connected = integrations.filter((i) => i.status === "Connected").length;
  const degraded = integrations.filter((i) => i.status === "Degraded").length;
  const errors = integrations.reduce((s, i) => s + i.errors24h, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Integrations"
        description="Connected systems, API credentials, sync health and outbound webhooks."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total integrations" value={integrations.length} tone="brand" icon={<Plug className="size-4" />} />
        <StatCard label="Connected" value={connected} tone="success" />
        <StatCard label="Degraded" value={degraded} tone="warning" />
        <StatCard label="Errors (24h)" value={errors} tone={errors > 0 ? "danger" : "default"} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((i) => {
          const key = `sk_live_${i.id.toLowerCase()}_a1b2c3d4e5f6g7h8`;
          const isRevealed = revealed[i.id];
          return (
            <Card key={i.id} className="gap-2.5 p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{i.name}</p>
                  <p className="text-xs text-muted-foreground">{i.category}</p>
                </div>
                <StatusBadge status={i.status} />
              </div>
              <div className="text-xs text-muted-foreground">
                Last sync {i.lastSync} · {i.direction} · {i.errors24h} errors/24h
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">API key</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    readOnly
                    value={isRevealed ? key : key.replace(/.(?=.{4})/g, "•")}
                    className="h-8 font-mono text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => setRevealed((r) => ({ ...r, [i.id]: !r[i.id] }))}
                  >
                    {isRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-1.5 pt-1">
                {i.status === "Not Configured" ? (
                  <Button size="sm" className="flex-1">
                    Connect
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="flex-1">
                      Reconnect
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-destructive">
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <Webhook className="size-4 text-brand" />
          <p className="text-sm font-semibold text-foreground">Webhooks</p>
        </div>
        <div className="divide-y divide-border">
          {webhooks.map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-foreground">{w.url}</p>
                <p className="text-xs text-muted-foreground">Event: {w.event}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={w.status === "Active" ? "default" : "secondary"}>{w.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
