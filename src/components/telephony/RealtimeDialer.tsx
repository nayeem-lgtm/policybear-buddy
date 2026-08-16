/**
 * Real-time dialer for the agent desk: inbound queue, softphone keypad,
 * live call controls (hold / mute / transfer), wrap-up dispositions,
 * callbacks and power dialing.
 *
 * Call signalling is stored in the CRM so every state is durable; the audio
 * layer plugs into `startCall` / `controlCall` when the carrier is wired.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Delete,
  Grip,
  Hash,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneOff,
  Play,
  PlusCircle,
  Rocket,
  Timer,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CALLBACK_STATUSES,
  CALLBACK_STATUS_TONE,
  clock,
  DISPOSITIONS,
  DISPOSITION_TONE,
  type CallbackStatus,
  type Disposition,
} from "@/lib/dialer-shared";
import { formatPhone } from "@/lib/phone";
import {
  claimNextLead,
  controlCall,
  createCallback,
  getDialerDesk,
  simulateInboundCall,
  startCall,
  updateCallback,
  wrapCall,
} from "@/lib/dialer.functions";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function useTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

function secondsSince(iso: string | null | undefined) {
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
}

export function RealtimeDialer() {
  const queryClient = useQueryClient();

  const loadDesk = useServerFn(getDialerDesk);
  const dial = useServerFn(startCall);
  const control = useServerFn(controlCall);
  const wrap = useServerFn(wrapCall);
  const bookCallback = useServerFn(createCallback);
  const patchCallback = useServerFn(updateCallback);
  const simulate = useServerFn(simulateInboundCall);
  const nextLead = useServerFn(claimNextLead);

  const desk = useQuery({
    queryKey: ["dialer-desk"],
    queryFn: () => loadDesk(),
    refetchInterval: 5000,
  });
  const data = desk.data;
  const active = data?.active ?? null;
  useTicker(Boolean(active) || (data?.queue.length ?? 0) > 0);

  const [digits, setDigits] = useState("");
  const [fromId, setFromId] = useState<string>("auto");
  const [disposition, setDisposition] = useState<Disposition | "">("");
  const [notes, setNotes] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [cb, setCb] = useState({ phone: "", contactName: "", reason: "Requested callback", scheduledAt: "" });
  const [sim, setSim] = useState({ phone: "", numberId: "auto" });
  const [campaignId, setCampaignId] = useState<string>("");
  const [lead, setLead] = useState<{ id: string; phone_e164: string; contact_name: string | null } | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dialer-desk"] });

  const dialMutation = useMutation({
    mutationFn: (input: Parameters<typeof dial>[0]["data"]) => dial({ data: input }),
    onSuccess: () => {
      toast.success("Dialing…");
      setDigits("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const controlMutation = useMutation({
    mutationFn: (input: { callId: string; action: "answer" | "hold" | "resume" | "mute" | "unmute" | "hangup" | "transfer"; transferTo?: string }) =>
      control({ data: input }),
    onSuccess: (_r, v) => {
      if (v.action === "hangup" || v.action === "transfer") toast.success("Call ended — add an outcome");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const wrapMutation = useMutation({
    mutationFn: () =>
      wrap({
        data: {
          callId: active?.id ?? "",
          disposition: disposition as Disposition,
          ...(notes ? { notes } : {}),
          ...(callbackAt ? { callbackAt, callbackReason: disposition as string } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Outcome saved");
      setDisposition("");
      setNotes("");
      setCallbackAt("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const callbackMutation = useMutation({
    mutationFn: () =>
      bookCallback({
        data: {
          phone: cb.phone,
          reason: cb.reason,
          ...(cb.contactName ? { contactName: cb.contactName } : {}),
          ...(cb.scheduledAt ? { scheduledAt: cb.scheduledAt } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Callback booked");
      setCb({ phone: "", contactName: "", reason: "Requested callback", scheduledAt: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const callbackStatusMutation = useMutation({
    mutationFn: (input: { id: string; status: CallbackStatus }) =>
      patchCallback({ data: { id: input.id, status: input.status } }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const simulateMutation = useMutation({
    mutationFn: () =>
      simulate({
        data: {
          phone: sim.phone,
          ...(sim.numberId !== "auto" ? { phoneNumberId: sim.numberId } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Inbound call placed in the queue");
      setSim((s) => ({ ...s, phone: "" }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leadMutation = useMutation({
    mutationFn: () => nextLead({ data: { campaignId } }),
    onSuccess: (res) => {
      if (!res.task) {
        setLead(null);
        toast.info("No leads left in this campaign right now");
        return;
      }
      setLead(res.task as never);
      toast.success(`Next lead: ${formatPhone(res.task.phone_e164)}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const liveSeconds = useMemo(() => {
    if (!active) return 0;
    if (active.answered_at) return secondsSince(active.answered_at);
    return secondsSince(active.queued_at);
  }, [active, desk.dataUpdatedAt]);

  const inWrap = active?.state === "wrap";
  const connected = active?.state === "connected" || active?.state === "hold";

  return (
    <div className="space-y-5">
      {/* --------------------------------------------------------- status strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Waiting in queue", value: data?.stats.waiting ?? 0, icon: PhoneIncoming, live: true },
          { label: "Calls today", value: data?.stats.calls ?? 0, icon: PhoneCall },
          { label: "Connected", value: data?.stats.connected ?? 0, icon: Users },
          { label: "Talk time", value: clock(data?.stats.talkSeconds ?? 0), icon: Timer },
          { label: "Sales", value: data?.stats.sales ?? 0, icon: Rocket },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <s.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="truncate text-xl font-semibold tabular-nums">{s.value}</p>
            </div>
            {s.live && (data?.stats.waiting ?? 0) > 0 ? (
              <span className="ml-auto size-2 animate-pulse rounded-full bg-emerald-500" />
            ) : null}
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* ------------------------------------------------------------ softphone */}
        <Card className="p-5">
          {active ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 p-5 text-center">
                <Badge variant="secondary" className="mb-2 capitalize">
                  {active.direction} · {active.state}
                </Badge>
                <p className="text-2xl font-semibold">{formatPhone(active.phone_e164)}</p>
                <p className="text-sm text-muted-foreground">{active.contact_name ?? "Unknown caller"}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">{clock(liveSeconds)}</p>
              </div>

              {inWrap ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Outcome</Label>
                    <Select value={disposition} onValueChange={(v) => setDisposition(v as Disposition)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a disposition" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISPOSITIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Schedule a callback (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={callbackAt}
                      onChange={(e) => setCallbackAt(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={!disposition || wrapMutation.isPending}
                    onClick={() => wrapMutation.mutate()}
                  >
                    Save outcome
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {active.state === "ringing" && active.direction === "inbound" ? (
                    <Button
                      className="col-span-3"
                      onClick={() => controlMutation.mutate({ callId: active.id, action: "answer" })}
                    >
                      <Phone className="mr-2 size-4" /> Answer
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    disabled={!connected}
                    onClick={() =>
                      controlMutation.mutate({
                        callId: active.id,
                        action: active.on_hold ? "resume" : "hold",
                      })
                    }
                  >
                    {active.on_hold ? <Play className="mr-1 size-4" /> : <Pause className="mr-1 size-4" />}
                    {active.on_hold ? "Resume" : "Hold"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!connected}
                    onClick={() =>
                      controlMutation.mutate({ callId: active.id, action: active.muted ? "unmute" : "mute" })
                    }
                  >
                    {active.muted ? <MicOff className="mr-1 size-4" /> : <Mic className="mr-1 size-4" />}
                    {active.muted ? "Unmute" : "Mute"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => controlMutation.mutate({ callId: active.id, action: "hangup" })}
                  >
                    <PhoneOff className="mr-1 size-4" /> End
                  </Button>
                  <div className="col-span-3 flex gap-2">
                    <Input
                      placeholder="Transfer to extension or number"
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={!connected || !transferTo}
                      onClick={() =>
                        controlMutation.mutate({ callId: active.id, action: "transfer", transferTo })
                      }
                    >
                      <PhoneForwarded className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/40 p-4">
                <Input
                  value={digits}
                  onChange={(e) => setDigits(e.target.value)}
                  placeholder="Enter a number"
                  className="h-12 border-0 bg-transparent text-center text-2xl font-semibold tracking-wider shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {KEYS.map((k) => (
                  <Button
                    key={k}
                    variant="outline"
                    className="h-12 text-lg"
                    onClick={() => setDigits((d) => d + k)}
                  >
                    {k}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Select value={fromId} onValueChange={setFromId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Caller ID" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatic caller ID</SelectItem>
                    {(data?.numbers ?? []).map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.label} · {formatPhone(n.e164)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => setDigits((d) => d.slice(0, -1))}>
                  <Delete className="size-4" />
                </Button>
              </div>
              <Button
                className="h-12 w-full"
                disabled={digits.length < 7 || dialMutation.isPending}
                onClick={() =>
                  dialMutation.mutate({
                    phone: digits,
                    mode: "manual",
                    ...(fromId !== "auto" ? { fromNumberId: fromId } : {}),
                  })
                }
              >
                <PhoneCall className="mr-2 size-4" /> Call
              </Button>
            </div>
          )}
        </Card>

        {/* ------------------------------------------------------------- work area */}
        <Card className="p-0">
          <Tabs defaultValue="queue">
            <div className="border-b px-4 pt-4">
              <TabsList>
                <TabsTrigger value="queue">
                  Inbound queue
                  {(data?.queue.length ?? 0) > 0 ? (
                    <Badge variant="secondary" className="ml-2">
                      {data?.queue.length}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="callbacks">Callbacks</TabsTrigger>
                <TabsTrigger value="power">Power dialer</TabsTrigger>
                <TabsTrigger value="history">Today</TabsTrigger>
              </TabsList>
            </div>

            {/* ------------------------------------------------------ inbound queue */}
            <TabsContent value="queue" className="m-0 p-4">
              <ScrollArea className="h-[340px] pr-3">
                {(data?.queue ?? []).length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No callers waiting. Inbound calls land here the moment they arrive.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(data?.queue ?? []).map((c) => (
                      <div key={c.id} className="flex items-center gap-3 rounded-xl border p-3">
                        <span className="grid size-9 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                          <PhoneIncoming className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{formatPhone(c.phone_e164)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.contact_name ?? "Unknown"} · waiting {clock(secondsSince(c.queued_at))}
                            {c.to_number ? ` · on ${formatPhone(c.to_number)}` : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={Boolean(active)}
                          onClick={() => controlMutation.mutate({ callId: c.id, action: "answer" })}
                        >
                          Answer
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Separator className="my-4" />
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Input
                  placeholder="Test caller number"
                  value={sim.phone}
                  onChange={(e) => setSim((s) => ({ ...s, phone: e.target.value }))}
                />
                <Select value={sim.numberId} onValueChange={(v) => setSim((s) => ({ ...s, numberId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Called number" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Any number</SelectItem>
                    {(data?.numbers ?? []).map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={sim.phone.length < 7 || simulateMutation.isPending}
                  onClick={() => simulateMutation.mutate()}
                >
                  <PhoneIncoming className="mr-2 size-4" /> Place test call
                </Button>
              </div>
            </TabsContent>

            {/* ---------------------------------------------------------- callbacks */}
            <TabsContent value="callbacks" className="m-0 p-4">
              <div className="grid gap-2 sm:grid-cols-4">
                <Input
                  placeholder="Phone"
                  value={cb.phone}
                  onChange={(e) => setCb((c) => ({ ...c, phone: e.target.value }))}
                />
                <Input
                  placeholder="Name"
                  value={cb.contactName}
                  onChange={(e) => setCb((c) => ({ ...c, contactName: e.target.value }))}
                />
                <Input
                  placeholder="Reason"
                  value={cb.reason}
                  onChange={(e) => setCb((c) => ({ ...c, reason: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Input
                    type="datetime-local"
                    value={cb.scheduledAt}
                    onChange={(e) => setCb((c) => ({ ...c, scheduledAt: e.target.value }))}
                  />
                  <Button
                    size="icon"
                    disabled={cb.phone.length < 7 || callbackMutation.isPending}
                    onClick={() => callbackMutation.mutate()}
                  >
                    <PlusCircle className="size-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="mt-4 h-[300px] pr-3">
                {(data?.callbacks ?? []).length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No open callbacks.</p>
                ) : (
                  <div className="space-y-2">
                    {(data?.callbacks ?? []).map((c) => (
                      <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {formatPhone(c.phone_e164)}{" "}
                            <span className="text-muted-foreground">{c.contact_name ?? ""}</span>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.reason}
                            {c.scheduled_at
                              ? ` · ${new Date(c.scheduled_at).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}`
                              : " · unscheduled"}
                            {c.attempts ? ` · ${c.attempts} attempts` : ""}
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            "border-0",
                            CALLBACK_STATUS_TONE[(c.status as CallbackStatus) ?? "Pending"],
                          )}
                        >
                          {c.status}
                        </Badge>
                        <Select
                          value={c.status}
                          onValueChange={(v) =>
                            callbackStatusMutation.mutate({ id: c.id, status: v as CallbackStatus })
                          }
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CALLBACK_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          disabled={Boolean(active)}
                          onClick={() =>
                            dialMutation.mutate({
                              phone: c.phone_e164,
                              mode: "manual",
                              callbackId: c.id,
                              ...(c.contact_name ? { contactName: c.contact_name } : {}),
                            })
                          }
                        >
                          <Phone className="mr-1 size-4" /> Call
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* -------------------------------------------------------- power dialer */}
            <TabsContent value="power" className="m-0 space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                <Select value={campaignId} onValueChange={setCampaignId}>
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Pick a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.campaigns ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} · {c.mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button disabled={!campaignId || leadMutation.isPending} onClick={() => leadMutation.mutate()}>
                  <Grip className="mr-2 size-4" /> Next lead
                </Button>
                {lead ? (
                  <Button
                    variant="default"
                    disabled={Boolean(active)}
                    onClick={() =>
                      dialMutation.mutate({
                        phone: lead.phone_e164,
                        mode: "power",
                        dialTaskId: lead.id,
                        campaignId,
                        ...(lead.contact_name ? { contactName: lead.contact_name } : {}),
                      })
                    }
                  >
                    <PhoneCall className="mr-2 size-4" /> Dial {formatPhone(lead.phone_e164)}
                  </Button>
                ) : null}
              </div>

              <ScrollArea className="h-[280px] pr-3">
                {(data?.tasks ?? []).length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No leads loaded. Operations can upload lists to a campaign in the phone system settings.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(data?.tasks ?? []).map((t) => (
                      <div key={t.id} className="flex items-center gap-3 rounded-xl border p-3">
                        <Hash className="size-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{formatPhone(t.phone_e164)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.contact_name ?? "Lead"} · {t.attempts} attempts
                            {t.last_outcome ? ` · ${t.last_outcome}` : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(active)}
                          onClick={() =>
                            dialMutation.mutate({
                              phone: t.phone_e164,
                              mode: "power",
                              dialTaskId: t.id,
                              ...(t.campaign_id ? { campaignId: t.campaign_id } : {}),
                              ...(t.contact_name ? { contactName: t.contact_name } : {}),
                            })
                          }
                        >
                          Dial
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ------------------------------------------------------------ history */}
            <TabsContent value="history" className="m-0 p-4">
              <ScrollArea className="h-[380px] pr-3">
                {(data?.today ?? []).length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No calls yet today.</p>
                ) : (
                  <div className="space-y-2">
                    {(data?.today ?? []).map((c) => (
                      <div key={c.id} className="flex items-center gap-3 rounded-xl border p-3">
                        <span className="grid size-9 place-items-center rounded-full bg-muted">
                          {c.direction === "inbound" ? (
                            <PhoneIncoming className="size-4" />
                          ) : (
                            <PhoneCall className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{formatPhone(c.phone_e164)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.queued_at).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}{" "}
                            · {clock(c.talk_seconds ?? 0)} talk
                          </p>
                        </div>
                        {c.disposition ? (
                          <Badge className={cn("border-0", DISPOSITION_TONE[c.disposition] ?? "")}>
                            {c.disposition}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="capitalize">
                            {c.state}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
