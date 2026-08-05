import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Headphones, PhoneCall, Timer } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPhone, formatTalk } from "@/lib/phone";
import { PROVIDER_LABEL } from "@/lib/telephony-shared";
import { getLiveCallMonitor } from "@/lib/telephony.functions";

export const Route = createFileRoute("/_shell/telephony-monitor")({
  head: () => ({
    meta: [
      { title: "Live Call Monitoring — Policy Bear CRM" },
      {
        name: "description",
        content: "Watch live dialer activity, agent talk time, dispositions and call recordings across CallTools and CallGrid.",
      },
      { property: "og:title", content: "Live Call Monitoring — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Watch live dialer activity, agent talk time, dispositions and call recordings in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TelephonyMonitorPage,
});

function TelephonyMonitorPage() {
  const fetchMonitor = useServerFn(getLiveCallMonitor);
  const monitor = useQuery({
    queryKey: ["telephony-monitor"],
    queryFn: () => fetchMonitor(),
    refetchInterval: 20000,
  });

  const data = monitor.data;

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Live call monitoring"
        description="Today's floor activity synced from the dialer and inbound tracking — talk time, dispositions and recordings, refreshed automatically."
        actions={
          <Button variant="outline" onClick={() => monitor.refetch()} disabled={monitor.isFetching}>
            <Activity className="size-4" /> Refresh
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Calls today" value={data?.totals.calls ?? "—"} tone="brand" icon={<PhoneCall className="size-4" />} />
        <StatCard label="On a call now" value={data?.totals.live ?? "—"} tone="success" icon={<Headphones className="size-4" />} />
        <StatCard
          label="Talk time today"
          value={data ? formatTalk(data.totals.talkSeconds) : "—"}
          tone="info"
          icon={<Timer className="size-4" />}
        />
        <StatCard label="Agents dialing" value={data?.agents.length ?? "—"} hint="Distinct agents with calls today" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Recent calls</h2>
          </div>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Time</th>
                  <th className="px-3 py-2 text-left font-medium">Agent</th>
                  <th className="px-3 py-2 text-left font-medium">Number</th>
                  <th className="px-3 py-2 text-left font-medium">Source</th>
                  <th className="px-3 py-2 text-left font-medium">Talk</th>
                  <th className="px-3 py-2 text-left font-medium">Outcome</th>
                  <th className="px-3 py-2 text-left font-medium">Recording</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No calls synced for today yet.
                    </td>
                  </tr>
                )}
                {(data?.recent ?? []).map((c) => (
                  <tr key={c.id} className="border-t border-border/60">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {c.started_at ? new Date(c.started_at).toLocaleTimeString() : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-foreground">{c.agent_name ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatPhone(c.direction === "inbound" ? c.from_number : c.to_number)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Badge variant="outline">{PROVIDER_LABEL[c.provider as "calltools" | "callgrid"]}</Badge>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatTalk(c.talk_seconds)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {c.disposition ?? c.status ?? "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {c.recording_url ? (
                        <a
                          href={c.recording_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-brand underline"
                        >
                          Listen
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Agent activity today</h2>
            <div className="space-y-2">
              {(data?.agents ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No agent activity synced yet.</p>
              )}
              {(data?.agents ?? []).map((a) => (
                <div key={a.agentName} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{a.agentName}</p>
                    {a.onLiveCall ? (
                      <Badge className="bg-success text-success-foreground">On call</Badge>
                    ) : (
                      <Badge variant="outline">Idle</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.calls} calls · {a.connected} connected · {formatTalk(a.talkSeconds)} talk ·{" "}
                    {a.lastDisposition ?? "no disposition"}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">CRM presence</h2>
            <div className="space-y-1.5">
              {(data?.presence ?? []).slice(0, 12).map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-foreground">{p.name}</span>
                  <StatusBadge status={p.presence} />
                </div>
              ))}
              {(data?.presence ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No staff profiles yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
