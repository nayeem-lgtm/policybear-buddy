/**
 * Phone system configuration: DIDs, phone menus, queues, business hours and
 * dialing campaigns. Operations and above can edit; everyone else reads.
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Save, Upload } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/PageHeader";
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
import { Textarea } from "@/components/ui/textarea";
import {
  AFTER_HOURS_ACTIONS,
  DIALER_MODES,
  OVERFLOW_ACTIONS,
  QUEUE_STRATEGIES,
} from "@/lib/dialer-shared";
import {
  addDialTasks,
  getPhoneSystem,
  saveCampaign,
  savePhoneNumber,
  saveQueue,
} from "@/lib/dialer.functions";
import { formatPhone } from "@/lib/phone";

export const Route = createFileRoute("/_shell/admin/phone-system")({
  head: () => ({
    meta: [
      { title: "Phone system — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Configure inbound numbers, phone menus, call queues, business hours and power dialing campaigns.",
      },
      { property: "og:title", content: "Phone system — Policy Bear CRM" },
      {
        property: "og:description",
        content: "DIDs, IVR menus, queues, routing hours and dialer campaigns in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PhoneSystemPage,
});

function PhoneSystemPage() {
  const queryClient = useQueryClient();
  const load = useServerFn(getPhoneSystem);
  const saveNumber = useServerFn(savePhoneNumber);
  const saveQ = useServerFn(saveQueue);
  const saveC = useServerFn(saveCampaign);
  const addLeads = useServerFn(addDialTasks);

  const system = useQuery({ queryKey: ["phone-system"], queryFn: () => load() });
  const data = system.data;
  const canEdit = data?.canEdit ?? false;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["phone-system"] });

  const [num, setNum] = useState({
    e164: "",
    label: "",
    kind: "inbound",
    queueId: "none",
    afterHoursAction: "voicemail",
    recordCalls: true,
    active: true,
  });
  const [queue, setQueue] = useState({
    name: "",
    strategy: "longest_idle",
    priority: 1,
    maxWaitSeconds: 300,
    ringSeconds: 25,
    wrapSeconds: 30,
    overflowAction: "voicemail",
    active: true,
  });
  const [camp, setCamp] = useState({
    name: "",
    mode: "power",
    pacing: 1,
    maxAttempts: 4,
    retryMinutes: 120,
    callingWindowStart: "09:00",
    callingWindowEnd: "20:00",
    active: true,
  });
  const [leads, setLeads] = useState({ campaignId: "", text: "" });

  const numberMutation = useMutation({
    mutationFn: () =>
      saveNumber({
        data: {
          e164: num.e164,
          label: num.label || num.e164,
          provider: "internal",
          kind: num.kind as "inbound",
          afterHoursAction: num.afterHoursAction as "voicemail",
          recordCalls: num.recordCalls,
          smsEnabled: false,
          active: num.active,
          ...(num.queueId !== "none" ? { queueId: num.queueId } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Number saved");
      setNum((n) => ({ ...n, e164: "", label: "" }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const queueMutation = useMutation({
    mutationFn: () =>
      saveQ({
        data: {
          name: queue.name,
          strategy: queue.strategy as "longest_idle",
          priority: queue.priority,
          maxWaitSeconds: queue.maxWaitSeconds,
          ringSeconds: queue.ringSeconds,
          wrapSeconds: queue.wrapSeconds,
          overflowAction: queue.overflowAction as "voicemail",
          announcePosition: true,
          active: queue.active,
        },
      }),
    onSuccess: () => {
      toast.success("Queue saved");
      setQueue((q) => ({ ...q, name: "" }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const campaignMutation = useMutation({
    mutationFn: () =>
      saveC({
        data: {
          name: camp.name,
          mode: camp.mode as "power",
          pacing: camp.pacing,
          maxAttempts: camp.maxAttempts,
          retryMinutes: camp.retryMinutes,
          callingWindowStart: camp.callingWindowStart,
          callingWindowEnd: camp.callingWindowEnd,
          active: camp.active,
        },
      }),
    onSuccess: () => {
      toast.success("Campaign saved");
      setCamp((c) => ({ ...c, name: "" }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leadMutation = useMutation({
    mutationFn: () =>
      addLeads({
        data: {
          campaignId: leads.campaignId,
          leads: leads.text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [phone, name, state] = line.split(",").map((v) => v?.trim());
              return {
                phone: phone ?? "",
                ...(name ? { contactName: name } : {}),
                ...(state ? { state } : {}),
              };
            }),
        },
      }),
    onSuccess: (res) => {
      toast.success(`${res.added} leads loaded`);
      setLeads((l) => ({ ...l, text: "" }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Operation"
        title="Phone system"
        description="Inbound numbers, call queues, business-hours routing and power dialing campaigns."
      />

      <Tabs defaultValue="numbers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="numbers">Numbers</TabsTrigger>
          <TabsTrigger value="queues">Queues</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="menus">Menus &amp; hours</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------- numbers */}
        <TabsContent value="numbers" className="space-y-4">
          {canEdit ? (
            <Card className="space-y-3 p-5">
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <Label className="text-xs">Number</Label>
                  <Input value={num.e164} onChange={(e) => setNum({ ...num, e164: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input value={num.label} onChange={(e) => setNum({ ...num, label: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Routes to queue</Label>
                  <Select value={num.queueId} onValueChange={(v) => setNum({ ...num, queueId: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No queue</SelectItem>
                      {(data?.queues ?? []).map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">After hours</Label>
                  <Select
                    value={num.afterHoursAction}
                    onValueChange={(v) => setNum({ ...num, afterHoursAction: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AFTER_HOURS_ACTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={num.recordCalls}
                    onCheckedChange={(v) => setNum({ ...num, recordCalls: v })}
                  />
                  Record calls
                </label>
                <Button
                  className="ml-auto"
                  disabled={num.e164.length < 7 || numberMutation.isPending}
                  onClick={() => numberMutation.mutate()}
                >
                  <Plus className="mr-2 size-4" /> Add number
                </Button>
              </div>
            </Card>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {(data?.numbers ?? []).map((n) => (
              <Card key={n.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{formatPhone(n.e164)}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.label} · {n.kind} · after hours: {n.after_hours_action}
                  </p>
                </div>
                <Badge variant={n.active ? "default" : "outline"}>{n.active ? "Active" : "Off"}</Badge>
              </Card>
            ))}
            {(data?.numbers ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No numbers configured yet.</p>
            ) : null}
          </div>
        </TabsContent>

        {/* -------------------------------------------------------------- queues */}
        <TabsContent value="queues" className="space-y-4">
          {canEdit ? (
            <Card className="space-y-3 p-5">
              <div className="grid gap-3 md:grid-cols-5">
                <div className="md:col-span-2">
                  <Label className="text-xs">Queue name</Label>
                  <Input value={queue.name} onChange={(e) => setQueue({ ...queue, name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Strategy</Label>
                  <Select value={queue.strategy} onValueChange={(v) => setQueue({ ...queue, strategy: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUEUE_STRATEGIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Ring seconds</Label>
                  <Input
                    type="number"
                    value={queue.ringSeconds}
                    onChange={(e) => setQueue({ ...queue, ringSeconds: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Overflow</Label>
                  <Select
                    value={queue.overflowAction}
                    onValueChange={(v) => setQueue({ ...queue, overflowAction: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OVERFLOW_ACTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="ml-auto"
                disabled={!queue.name || queueMutation.isPending}
                onClick={() => queueMutation.mutate()}
              >
                <Save className="mr-2 size-4" /> Save queue
              </Button>
            </Card>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {(data?.queues ?? []).map((q) => (
              <Card key={q.id} className="p-4">
                <p className="font-medium">{q.name}</p>
                <p className="text-xs text-muted-foreground">
                  {q.strategy.replace(/_/g, " ")} · ring {q.ring_seconds}s · wrap {q.wrap_seconds}s ·
                  overflow {q.overflow_action}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(data?.members ?? []).filter((m) => m.queue_id === q.id).length} agents assigned
                </p>
              </Card>
            ))}
            {(data?.queues ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No queues yet.</p>
            ) : null}
          </div>
        </TabsContent>

        {/* ----------------------------------------------------------- campaigns */}
        <TabsContent value="campaigns" className="space-y-4">
          {canEdit ? (
            <Card className="space-y-3 p-5">
              <div className="grid gap-3 md:grid-cols-5">
                <div className="md:col-span-2">
                  <Label className="text-xs">Campaign name</Label>
                  <Input value={camp.name} onChange={(e) => setCamp({ ...camp, name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Mode</Label>
                  <Select value={camp.mode} onValueChange={(v) => setCamp({ ...camp, mode: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIALER_MODES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Window start</Label>
                  <Input
                    type="time"
                    value={camp.callingWindowStart}
                    onChange={(e) => setCamp({ ...camp, callingWindowStart: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Window end</Label>
                  <Input
                    type="time"
                    value={camp.callingWindowEnd}
                    onChange={(e) => setCamp({ ...camp, callingWindowEnd: e.target.value })}
                  />
                </div>
              </div>
              <Button
                className="ml-auto"
                disabled={!camp.name || campaignMutation.isPending}
                onClick={() => campaignMutation.mutate()}
              >
                <Save className="mr-2 size-4" /> Save campaign
              </Button>
            </Card>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {(data?.campaigns ?? []).map((c) => (
              <Card key={c.id} className="p-4">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.mode} · pacing {c.pacing} · {c.calling_window_start}–{c.calling_window_end} ·{" "}
                  {c.max_attempts} attempts
                </p>
              </Card>
            ))}
          </div>

          {canEdit ? (
            <Card className="space-y-3 p-5">
              <div>
                <Label className="text-xs">Load leads (one per line: phone, name, state)</Label>
                <Textarea
                  rows={5}
                  value={leads.text}
                  onChange={(e) => setLeads({ ...leads, text: e.target.value })}
                  placeholder="+15550100123, Jane Doe, TX"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={leads.campaignId}
                  onValueChange={(v) => setLeads({ ...leads, campaignId: v })}
                >
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.campaigns ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!leads.campaignId || !leads.text.trim() || leadMutation.isPending}
                  onClick={() => leadMutation.mutate()}
                >
                  <Upload className="mr-2 size-4" /> Load leads
                </Button>
              </div>
            </Card>
          ) : null}
        </TabsContent>

        {/* ------------------------------------------------------- menus & hours */}
        <TabsContent value="menus" className="grid gap-3 md:grid-cols-2">
          <Card className="p-4">
            <p className="mb-2 font-medium">Phone menus</p>
            {(data?.menus ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No menus yet.</p>
            ) : (
              (data?.menus ?? []).map((m) => (
                <div key={m.id} className="border-t py-2 first:border-0">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.greeting}</p>
                </div>
              ))
            )}
          </Card>
          <Card className="p-4">
            <p className="mb-2 font-medium">Business hours</p>
            {(data?.hours ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hour profiles yet.</p>
            ) : (
              (data?.hours ?? []).map((h) => (
                <div key={h.id} className="border-t py-2 first:border-0">
                  <p className="text-sm font-medium">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{h.timezone}</p>
                </div>
              ))
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
