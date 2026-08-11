import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Copy, PlugZap, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ACTION_LABEL, explainFailure, SPEC_CAPABILITIES } from "@/lib/calltools-shared";
import {
  flushWriteQueue,
  getIntegrationControl,
  linkCallToolsAgent,
  refreshCallToolsReference,
  updateIntegrationSettings,
} from "@/lib/calltools-desk.functions";

export const Route = createFileRoute("/_shell/admin/calltools")({
  head: () => ({
    meta: [
      { title: "CallTools Control — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Configure the two-way CallTools connection: write switches, agent seat linking, dispositions, webhooks and the retry queue.",
      },
      { property: "og:title", content: "CallTools Control — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Two-way CallTools settings, seat linking, real-time hooks and a full audit of everything the CRM sends.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CallToolsControlPage,
});

const CAPABILITY_LABEL: Record<keyof typeof SPEC_CAPABILITIES, string> = {
  dial: "Dial from the CRM",
  setAgentStatus: "Push agent status",
  setDisposition: "Write call outcomes",
  callControl: "End / transfer live calls",
  contacts: "Create & update contacts",
  callbacks: "Schedule callbacks",
  sms: "Send text messages",
  webhooks: "Real-time updates",
};

function CallToolsControlPage() {
  const loadControl = useServerFn(getIntegrationControl);
  const saveSettings = useServerFn(updateIntegrationSettings);
  const linkAgent = useServerFn(linkCallToolsAgent);
  const refreshReference = useServerFn(refreshCallToolsReference);
  const flushQueue = useServerFn(flushWriteQueue);
  const queryClient = useQueryClient();

  const [connectorId, setConnectorId] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const control = useQuery({
    queryKey: ["calltools-control"],
    queryFn: () => loadControl(),
    refetchInterval: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["calltools-control"] });

  const settingsMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => saveSettings({ data: patch }),
    onSuccess: () => {
      toast.success("Settings saved");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const linkMutation = useMutation({
    mutationFn: (input: { agentRowId: string; userId: string | null }) => linkAgent({ data: input }),
    onSuccess: () => {
      toast.success("Seat updated");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const referenceMutation = useMutation({
    mutationFn: (registerWebhooks: boolean) =>
      refreshReference({
        data: {
          registerWebhooks,
          ...(typeof window === "undefined" ? {} : { origin: window.location.origin }),
        },
      }),
    onSuccess: (res) => {
      const errors = Object.entries(res).filter(([k]) => k.endsWith("Error"));
      if (errors.length) toast.warning(errors.map(([, v]) => String(v)).join(" · "));
      else toast.success("CallTools reference data refreshed");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const flushMutation = useMutation({
    mutationFn: (id?: string) => flushQueue({ data: id ? { id } : {} }),
    onSuccess: (res) => {
      if (res.skipped) toast.warning("Sending is switched off, so nothing was retried.");
      else toast.success(`Retried ${res.drained} · ${res.sent} accepted · ${res.failed} still failing`);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const data = control.data;
  const settings = data?.settings;
  const totals = data?.health.totals24h;

  const webhookUrl =
    settings && typeof window !== "undefined"
      ? `${window.location.origin}/api/public/hooks/calltools?token=${settings.webhook_token}`
      : "";

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="CallTools control"
        description="The CRM is the source of truth. This page controls what it is allowed to send back to CallTools, which seat belongs to which employee, and what happens when CallTools is unreachable."
        actions={
          <>
            <Button variant="outline" onClick={() => referenceMutation.mutate(false)} disabled={referenceMutation.isPending}>
              <RefreshCw className={referenceMutation.isPending ? "size-4 animate-spin" : "size-4"} /> Refresh from
              CallTools
            </Button>
            <Button onClick={() => referenceMutation.mutate(true)} disabled={referenceMutation.isPending}>
              <PlugZap className="size-4" /> Turn on real-time updates
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Connection"
          value={data?.keyConfigured ? "Key configured" : "No key"}
          tone={data?.keyConfigured ? "success" : "danger"}
          hint="CallTools API credentials"
        />
        <StatCard
          label="Sending to CallTools"
          value={settings?.writes_enabled ? "On" : "Off"}
          tone={settings?.writes_enabled ? "success" : "warning"}
          hint="Master switch for every write"
        />
        <StatCard
          label="Linked seats"
          value={data ? `${data.agents.filter((a) => a.user_id).length} / ${data.agents.length}` : "—"}
          tone="info"
          hint="CallTools agents matched to employees"
        />
        <StatCard
          label="Waiting to send"
          value={data?.health.queue.length ?? "—"}
          tone={(data?.health.queue.length ?? 0) > 0 ? "warning" : "success"}
          hint={totals ? `${totals.sent} accepted in 24h` : "Retry queue"}
        />
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="mb-4">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="seats">Agent seats</TabsTrigger>
          <TabsTrigger value="outcomes">Call outcomes</TabsTrigger>
          <TabsTrigger value="queue">Queue &amp; audit</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">What the CRM may do</h2>
              <div className="space-y-3">
                {[
                  {
                    key: "writes_enabled" as const,
                    label: "Send changes to CallTools",
                    hint: "Master switch. Turn it off and everything queues safely instead.",
                  },
                  {
                    key: "dial_enabled" as const,
                    label: "Let agents dial from the CRM",
                    hint: "Uses the connector button below to start the call on their web phone.",
                  },
                  {
                    key: "status_sync_enabled" as const,
                    label: "Keep status in step",
                    hint: "Break, lunch and available are mirrored into the dialer.",
                  },
                  {
                    key: "webhooks_enabled" as const,
                    label: "Accept real-time updates",
                    hint: "CallTools pushes calls and status changes to us the moment they happen.",
                  },
                ].map((row) => (
                  <div key={row.key} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{row.label}</p>
                      <p className="text-xs text-muted-foreground">{row.hint}</p>
                    </div>
                    <Switch
                      checked={Boolean(settings?.[row.key])}
                      onCheckedChange={(checked) => settingsMutation.mutate({ [row.key]: checked })}
                      disabled={!settings || settingsMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Dialing details</h2>
              <div className="space-y-3">
                <div>
                  <Label className="mb-1.5 block">Connector button ID</Label>
                  <div className="flex gap-2">
                    <Input
                      value={connectorId ?? settings?.connector_button_id ?? ""}
                      onChange={(e) => setConnectorId(e.target.value)}
                      placeholder="From CallTools → Integrations → Connector buttons"
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        settingsMutation.mutate({ connector_button_id: (connectorId ?? "").trim() || null })
                      }
                      disabled={connectorId === null || settingsMutation.isPending}
                    >
                      Save
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This is what makes an agent&apos;s phone ring when they press Call in the CRM.
                  </p>
                </div>
                <div>
                  <Label className="mb-1.5 block">Default campaign ID</Label>
                  <div className="flex gap-2">
                    <Input
                      value={campaignId ?? settings?.default_campaign_id ?? ""}
                      onChange={(e) => setCampaignId(e.target.value)}
                      placeholder="Optional"
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        settingsMutation.mutate({ default_campaign_id: (campaignId ?? "").trim() || null })
                      }
                      disabled={campaignId === null || settingsMutation.isPending}
                    >
                      Save
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block">Real-time update address</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                    <Button
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard.writeText(webhookUrl);
                        toast.success("Address copied");
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Keep this address private — the token in it is what proves the caller is CallTools.
                  </p>
                </div>
              </div>

              <h3 className="mt-4 mb-2 text-sm font-semibold text-foreground">Available in the CallTools API</h3>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {Object.entries(CAPABILITY_LABEL).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="size-3.5 text-success" />
                    <span className="text-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seats">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">CallTools seat</th>
                    <th className="px-4 py-3">Provider status</th>
                    <th className="px-4 py-3">Web phone</th>
                    <th className="px-4 py-3">Employee</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.agents ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No seats synced yet — use “Refresh from CallTools”.
                      </td>
                    </tr>
                  )}
                  {(data?.agents ?? []).map((a) => (
                    <tr key={a.id} className="border-b border-border/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{a.provider_agent_name ?? "Unnamed seat"}</p>
                        <p className="text-xs text-muted-foreground">{a.provider_agent_email ?? a.provider_agent_id}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.provider_status ?? "—"}</td>
                      <td className="px-4 py-3">
                        {a.web_phone_status ? (
                          <Badge variant="secondary">{a.web_phone_status}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not registered</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={a.user_id ?? "none"}
                          onValueChange={(value) =>
                            linkMutation.mutate({ agentRowId: a.id, userId: value === "none" ? null : value })
                          }
                        >
                          <SelectTrigger className="w-56">
                            <SelectValue placeholder="Not linked" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not linked</SelectItem>
                            {(data?.profiles ?? []).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} · {p.department}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Call outcomes agents can choose</h2>
                <p className="text-xs text-muted-foreground">
                  Pulled from CallTools so both systems report the same words. Sales and callback outcomes are detected
                  automatically.
                </p>
              </div>
              <Button variant="outline" onClick={() => referenceMutation.mutate(false)} disabled={referenceMutation.isPending}>
                <RefreshCw className={referenceMutation.isPending ? "size-4 animate-spin" : "size-4"} /> Pull list
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(data?.dispositions ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No outcomes synced yet. Press “Pull list” to import them from CallTools.
                </p>
              )}
              {(data?.dispositions ?? []).map((d) => (
                <div key={d.provider_disposition_id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{d.name}</p>
                    {d.is_sale ? (
                      <Badge variant="secondary">Sale</Badge>
                    ) : d.is_callback ? (
                      <Badge variant="outline">Callback</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{d.category ?? "General"}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Waiting to reach CallTools</h2>
                <Button variant="outline" size="sm" onClick={() => flushMutation.mutate(undefined)} disabled={flushMutation.isPending}>
                  <RefreshCw className={flushMutation.isPending ? "size-4 animate-spin" : "size-4"} /> Retry all
                </Button>
              </div>
              <div className="space-y-2">
                {(data?.health.queue ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nothing waiting — every change reached CallTools.</p>
                )}
                {(data?.health.queue ?? []).map((q) => (
                  <div key={q.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {ACTION_LABEL[q.action] ?? q.action}
                        {q.target_ref ? ` · ${q.target_ref}` : ""}
                      </p>
                      <Badge variant={q.status === "Failed" ? "destructive" : "outline"}>{q.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Attempt {q.attempts} of {q.max_attempts} · next try{" "}
                      {q.next_attempt_at ? new Date(q.next_attempt_at).toLocaleTimeString() : "—"}
                    </p>
                    {q.last_error && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-destructive">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        {explainFailure(q.last_error)}
                      </p>
                    )}
                    <Button
                      className="mt-2"
                      size="sm"
                      variant="ghost"
                      onClick={() => flushMutation.mutate(q.id)}
                      disabled={flushMutation.isPending}
                    >
                      Retry now
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-1 text-sm font-semibold text-foreground">Everything the CRM sent</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Last 40 requests, newest first — kept for audit.
              </p>
              <div className="space-y-1.5">
                {(data?.health.log ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                )}
                {(data?.health.log ?? []).map((l) => (
                  <div key={l.id} className="flex items-start gap-2 rounded-md border border-border px-3 py-2">
                    {l.ok ? (
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">
                        {ACTION_LABEL[l.action] ?? l.action} · {l.method} {l.path}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleString()}
                        {l.response_status ? ` · HTTP ${l.response_status}` : ""}
                        {l.duration_ms ? ` · ${l.duration_ms}ms` : ""}
                      </p>
                      {l.error && <p className="text-xs text-destructive">{explainFailure(l.error)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
