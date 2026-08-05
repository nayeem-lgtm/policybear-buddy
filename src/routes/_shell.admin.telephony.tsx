import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTelephonyStatus, runTelephonySync } from "@/lib/telephony.functions";
import { PROVIDER_LABEL, PROVIDERS } from "@/lib/telephony-shared";

export const Route = createFileRoute("/_shell/admin/telephony")({
  head: () => ({
    meta: [
      { title: "Telephony Sync — Policy Bear CRM" },
      {
        name: "description",
        content: "Monitor the CallTools and CallGrid sync engine, run backfills and review provider capabilities.",
      },
      { property: "og:title", content: "Telephony Sync — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Monitor the CallTools and CallGrid sync engine, run backfills and review provider capabilities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TelephonySyncPage,
});

const CAPABILITY_LABEL: Record<string, string> = {
  dial: "Dial from CRM",
  setAgentStatus: "Push agent status",
  setDisposition: "Write dispositions",
  pushContact: "Push contacts / lists",
  webhooks: "Real-time webhooks",
};

function TelephonySyncPage() {
  const fetchStatus = useServerFn(getTelephonyStatus);
  const sync = useServerFn(runTelephonySync);
  const queryClient = useQueryClient();

  const status = useQuery({ queryKey: ["telephony-status"], queryFn: () => fetchStatus() });

  const run = useMutation({
    mutationFn: (maxItems: number) => sync({ data: { maxItems } }),
    onSuccess: (res) => {
      const failed = res.outcomes.filter((o) => o.status === "error");
      if (failed.length === 0) {
        toast.success(`Synced ${res.outcomes.reduce((s, o) => s + o.records, 0)} calls · ${res.journeysRebuilt} journeys rebuilt`);
      } else {
        toast.error(failed.map((f) => `${PROVIDER_LABEL[f.provider]}: ${f.error}`).join(" · "));
      }
      queryClient.invalidateQueries({ queryKey: ["telephony-status"] });
      queryClient.invalidateQueries({ queryKey: ["telephony-calls"] });
      queryClient.invalidateQueries({ queryKey: ["telephony-attribution"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const data = status.data;

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Telephony sync engine"
        description="CallTools (dialer) and CallGrid (inbound tracking) are pulled into one normalised call store, then scrubbed against each other to attribute callbacks and sales."
        actions={
          <>
            <Button variant="outline" onClick={() => run.mutate(200)} disabled={run.isPending}>
              <RefreshCw className={run.isPending ? "size-4 animate-spin" : "size-4"} /> Sync now
            </Button>
            <Button onClick={() => run.mutate(2000)} disabled={run.isPending}>
              Full backfill
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Synced calls" value={data?.totals.calls ?? "—"} tone="brand" hint="Both providers combined" />
        <StatCard label="Lead journeys" value={data?.totals.journeys ?? "—"} tone="info" hint="Unique numbers scrubbed" />
        <StatCard
          label="Attribution window"
          value={data ? `${data.attributionWindowDays} days` : "—"}
          hint="Inbound → callback match window"
        />
        <StatCard
          label="API keys"
          value={data ? `${Number(data.keys.calltools) + Number(data.keys.callgrid)} / 2` : "—"}
          tone={data && data.keys.calltools && data.keys.callgrid ? "success" : "warning"}
          hint="Provider credentials configured"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Sync status</h2>
          <div className="space-y-2">
            {(data?.sync ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No sync has run yet. Use “Sync now” to pull the first batch.</p>
            )}
            {(data?.sync ?? []).map((row) => (
              <div key={`${row.provider}-${row.resource}`} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {PROVIDER_LABEL[row.provider as keyof typeof PROVIDER_LABEL] ?? row.provider} · {row.resource}
                  </p>
                  <Badge variant={row.last_status === "success" ? "secondary" : "destructive"}>
                    {row.last_status ?? "pending"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Last run {row.last_run_at ? new Date(row.last_run_at).toLocaleString() : "—"} ·{" "}
                  {row.records_last_run ?? 0} records this run · {row.records_total ?? 0} total
                </p>
                {row.last_error && <p className="mt-1 text-xs font-medium text-destructive">{row.last_error}</p>}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">What each provider allows</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Greyed-out actions are not exposed on the current provider plan. When they are enabled, the same buttons in the
            CRM go live with no rebuild.
          </p>
          <div className="space-y-3">
            {PROVIDERS.map((provider) => {
              const caps = data?.capabilities[provider];
              return (
                <div key={provider} className="rounded-md border border-border p-3">
                  <p className="mb-2 text-sm font-medium text-foreground">{PROVIDER_LABEL[provider]}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {Object.entries(CAPABILITY_LABEL).map(([key, label]) => {
                      const on = Boolean(caps?.[key as keyof typeof caps]);
                      return (
                        <div key={key} className="flex items-center gap-1.5 text-xs">
                          {on ? (
                            <CheckCircle2 className="size-3.5 text-success" />
                          ) : (
                            <XCircle className="size-3.5 text-muted-foreground" />
                          )}
                          <span className={on ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-xs text-muted-foreground">
              Agents keep dialing inside CallTools for now. This CRM stays the source of truth: every call, talk time,
              disposition and recording is synced here, monitored live, and scrubbed against CallGrid for source attribution.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
