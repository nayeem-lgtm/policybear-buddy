import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PhoneForwarded, PhoneOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { explainFailure } from "@/lib/calltools-shared";
import { controlLiveCall, getFloorView } from "@/lib/calltools-desk.functions";

export const Route = createFileRoute("/_shell/telephony-floor")({
  head: () => ({
    meta: [
      { title: "Live Floor — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Watch every agent and every live CallTools call in real time, with end-call and transfer controls for managers.",
      },
      { property: "og:title", content: "Live Floor — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Real-time agent roster, live calls and talk-time totals pulled straight from CallTools.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FloorPage,
});

function hhmm(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
}

const STATE_TONE: Record<string, "secondary" | "outline" | "destructive"> = {
  Available: "secondary",
  "On Call": "secondary",
  Break: "outline",
  Lunch: "outline",
  "Signed Out": "outline",
};

function FloorPage() {
  const loadFloor = useServerFn(getFloorView);
  const control = useServerFn(controlLiveCall);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const floor = useQuery({
    queryKey: ["telephony-floor"],
    queryFn: () => loadFloor(),
    refetchInterval: 10_000,
  });

  const controlMutation = useMutation({
    mutationFn: (input: { callUuid: string; action: "hangup" | "transfer" }) => control({ data: input }),
    onSuccess: (res, vars) => {
      toast[res.applied ? "success" : "warning"](
        res.applied ? (vars.action === "hangup" ? "Call ended" : "Call transferred") : explainFailure(res.error),
      );
      queryClient.invalidateQueries({ queryKey: ["telephony-floor"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const data = floor.data;
  const roster = (data?.roster ?? []).filter((r) => {
    const matchesSearch =
      !search ||
      (r.provider_agent_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.provider_agent_email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "on-call" ? Boolean(r.liveCall) : r.crmStatus === statusFilter);
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Live floor"
        description="Who is on the phone right now, what CallTools shows for them, and how the day is tracking. Updates every ten seconds."
        actions={
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["telephony-floor"] })}
            disabled={floor.isFetching}
          >
            <RefreshCw className={floor.isFetching ? "size-4 animate-spin" : "size-4"} /> Refresh
          </Button>
        }
      />

      {data?.liveError && (
        <Card className="mb-4 border-warning/40 bg-warning/10 p-3 text-sm text-muted-foreground">
          Live calls are unavailable right now — {explainFailure(data.liveError)} Roster and totals below still come
          from the CRM.
        </Card>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="On a call now" value={data?.totals.onCall ?? "—"} tone="brand" />
        <StatCard
          label="Linked seats"
          value={data ? `${data.totals.linked} / ${data.totals.agents}` : "—"}
          tone={data && data.totals.linked === data.totals.agents ? "success" : "warning"}
          hint="CallTools agents matched to CRM users"
        />
        <StatCard label="Calls today" value={data?.totals.calls ?? "—"} tone="info" />
        <StatCard label="Talk time today" value={data ? hhmm(data.totals.talkSeconds) : "—"} />
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents"
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            <SelectItem value="on-call">On a call</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Break">On break</SelectItem>
            <SelectItem value="Lunch">At lunch</SelectItem>
            <SelectItem value="Signed Out">Signed out</SelectItem>
            <SelectItem value="Off shift">Off shift</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{roster.length} shown</span>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">CRM status</th>
                  <th className="px-4 py-3">CallTools</th>
                  <th className="px-4 py-3">Calls</th>
                  <th className="px-4 py-3">Talk</th>
                  <th className="px-4 py-3">Live call</th>
                </tr>
              </thead>
              <tbody>
                {roster.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No agents match these filters.
                    </td>
                  </tr>
                )}
                {roster.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{r.provider_agent_name ?? "Unnamed seat"}</p>
                      <p className="text-xs text-muted-foreground">{r.provider_agent_email ?? r.provider_agent_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATE_TONE[r.crmStatus] ?? "outline"}>{r.crmStatus}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.provider_status ?? "—"}
                      {r.web_phone_status ? ` · phone ${r.web_phone_status}` : ""}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.calls} <span className="text-xs">({r.connected} connected)</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{hhmm(r.talkSeconds)}</td>
                    <td className="px-4 py-3">
                      {r.liveCall ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary">{r.liveCall.to ?? r.liveCall.from ?? "In progress"}</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              controlMutation.mutate({ callUuid: r.liveCall!.callUuid, action: "hangup" })
                            }
                          >
                            <PhoneOff className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              controlMutation.mutate({ callUuid: r.liveCall!.callUuid, action: "transfer" })
                            }
                          >
                            <PhoneForwarded className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Idle</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Calls in progress</h2>
          <div className="space-y-2">
            {(data?.live ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nobody is on a call right now.</p>
            )}
            {(data?.live ?? []).map((c) => (
              <div key={c.callUuid} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{c.agentName ?? "Unknown agent"}</p>
                  <Badge variant="secondary">{hhmm(c.seconds)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.direction ?? "call"} · {c.to ?? c.from ?? "—"} · {c.campaign ?? "No campaign"}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => controlMutation.mutate({ callUuid: c.callUuid, action: "hangup" })}
                  >
                    <PhoneOff className="size-4" /> End
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => controlMutation.mutate({ callUuid: c.callUuid, action: "transfer" })}
                  >
                    <PhoneForwarded className="size-4" /> Transfer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
