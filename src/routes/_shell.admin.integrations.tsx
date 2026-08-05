import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, PhoneCall, Plug, RefreshCw, Webhook } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { integrations } from "@/lib/mock-data";
import { getCallToolsOverview, getCallToolsStatus, testCallTools } from "@/lib/calltools.functions";
import { getCallGridStatus, testCallGrid } from "@/lib/callgrid.functions";


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

function CallToolsPanel() {
  const fetchStatus = useServerFn(getCallToolsStatus);
  const runTest = useServerFn(testCallTools);

  const fetchOverview = useServerFn(getCallToolsOverview);

  const status = useQuery({ queryKey: ["calltools-status"], queryFn: () => fetchStatus() });
  const overview = useQuery({ queryKey: ["calltools-overview"], queryFn: () => fetchOverview() });

  const test = useMutation({
    mutationFn: () => runTest(),
    onSuccess: (res) => {
      if (res.status === "Connected") toast.success("CallTools connected");
      else toast.error(res.lastError ?? "CallTools connection failed");
      status.refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const row = status.data?.integration;

  return (
    <Card className="gap-3 p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <PhoneCall className="size-4 text-brand" />
          <div>
            <p className="text-sm font-semibold text-foreground">CallTools</p>
            <p className="text-xs text-muted-foreground">Dialer / Telephony · live connection</p>
          </div>
        </div>
        <StatusBadge status={(row?.status as string) ?? "Not Configured"} />
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <span className="text-foreground">Base URL:</span>{" "}
          <span className="font-mono">{status.data?.baseUrl ?? "—"}</span>
        </div>
        <div>
          <span className="text-foreground">API key:</span>{" "}
          {status.data?.keyConfigured ? (
            <Badge variant="default">Stored securely</Badge>
          ) : (
            <Badge variant="secondary">Missing</Badge>
          )}
        </div>
        <div>
          <span className="text-foreground">Last check:</span>{" "}
          {row?.last_sync_at ? new Date(row.last_sync_at).toLocaleString() : "Never"}
        </div>
        <div>
          <span className="text-foreground">Auth:</span> Token header
        </div>
      </div>

      {row?.last_error ? <p className="text-xs text-destructive">{row.last_error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" onClick={() => test.mutate()} disabled={test.isPending}>
          <RefreshCw className={`size-3.5 ${test.isPending ? "animate-spin" : ""}`} />
          {test.isPending ? "Testing…" : "Test connection"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => overview.refetch()} disabled={overview.isFetching}>
          Sync live data
        </Button>
      </div>

      {overview.data ? (
        <>
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-5">
            {(
              [
                ["Calls", overview.data.counts.calls.count],
                ["Contacts", overview.data.counts.contacts.count],
                ["Campaigns", overview.data.counts.campaigns.count],
                ["Users", overview.data.counts.users.count],
                ["SMS", overview.data.counts.sms.count],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-md border border-border p-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-base font-semibold text-foreground">{value ?? "—"}</p>
              </div>
            ))}
          </div>

          {overview.data.recentCalls.length > 0 ? (
            <div className="divide-y divide-border pt-1">
              <p className="pb-1 text-xs font-semibold text-foreground">Recent CallTools calls</p>
              {overview.data.recentCalls.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                  <span className="font-mono text-foreground">
                    {c.from ?? "—"} → {c.to ?? "—"}
                  </span>
                  <span className="text-muted-foreground">
                    {c.direction ?? "—"} · {c.status ?? "—"} · {c.duration ?? 0}s ·{" "}
                    {c.startedAt ? new Date(c.startedAt).toLocaleString() : "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : overview.isError ? (
        <p className="text-xs text-destructive">{(overview.error as Error).message}</p>
      ) : null}
    </Card>
  );
}

function CallGridPanel() {
  const fetchStatus = useServerFn(getCallGridStatus);
  const runTest = useServerFn(testCallGrid);

  const status = useQuery({ queryKey: ["callgrid-status"], queryFn: () => fetchStatus() });

  const test = useMutation({
    mutationFn: () => runTest(),
    onSuccess: (res) => {
      if (res.status === "Connected") toast.success(`CallGrid connected via ${res.workingPath}`);
      else toast.error(res.lastError ?? "CallGrid connection failed");
      status.refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const row = status.data?.integration;
  const config = (row?.config as { resourcePath?: string | null; authScheme?: string | null } | null) ?? null;

  return (
    <Card className="gap-3 p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <PhoneCall className="size-4 text-brand" />
          <div>
            <p className="text-sm font-semibold text-foreground">CallGrid</p>
            <p className="text-xs text-muted-foreground">Dialer / Telephony · live connection</p>
          </div>
        </div>
        <StatusBadge status={(row?.status as string) ?? "Not Configured"} />
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <span className="text-foreground">Base URL:</span>{" "}
          <span className="font-mono">{status.data?.baseUrl ?? "—"}</span>
        </div>
        <div>
          <span className="text-foreground">API key:</span>{" "}
          {status.data?.keyConfigured ? (
            <Badge variant="default">Stored securely</Badge>
          ) : (
            <Badge variant="secondary">Missing</Badge>
          )}
        </div>
        <div>
          <span className="text-foreground">Last check:</span>{" "}
          {row?.last_sync_at ? new Date(row.last_sync_at).toLocaleString() : "Never"}
        </div>
        <div>
          <span className="text-foreground">Auth:</span> {config?.authScheme ?? "auto-detect"}
        </div>
        <div className="sm:col-span-2">
          <span className="text-foreground">Resource path:</span>{" "}
          <span className="font-mono">{config?.resourcePath ?? "not discovered yet"}</span>
        </div>
        <div className="sm:col-span-2">
          <span className="text-foreground">Console:</span>{" "}
          <a
            className="font-mono underline"
            href="https://app.callgrid.com/organization/api-keys"
            target="_blank"
            rel="noreferrer"
          >
            app.callgrid.com/organization/api-keys
          </a>
        </div>
      </div>

      {row?.last_error ? <p className="text-xs text-destructive">{row.last_error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" onClick={() => test.mutate()} disabled={test.isPending}>
          <RefreshCw className={`size-3.5 ${test.isPending ? "animate-spin" : ""}`} />
          {test.isPending ? "Testing…" : "Test connection"}
        </Button>
      </div>
    </Card>
  );
}



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

      <div className="grid gap-3 lg:grid-cols-2">
        <CallToolsPanel />
        <CallGridPanel />
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
