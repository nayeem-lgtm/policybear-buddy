import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Coffee,
  Loader2,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  RefreshCw,
  Send,
  UserPlus,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/crm/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useShift } from "@/context/ShiftContext";
import { explainFailure } from "@/lib/calltools-shared";
import {
  dialFromCrm,
  controlLiveCall,
  getAgentDesk,
  saveCrmContact,
  scheduleCallback,
  sendCallToolsSms,
  submitDisposition,
} from "@/lib/calltools-desk.functions";

function hhmm(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}h ${m.toString().padStart(2, "0")}m`
    : `${m}:${s.toString().padStart(2, "0")}`;
}

function timeLabel(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/**
 * The agent's single working screen: presence, dialer, the live call, the
 * disposition prompt and today's activity — all backed by CallTools.
 */
export function AgentWorkspace() {
  const queryClient = useQueryClient();
  const { status, setStatus } = useShift();

  const loadDesk = useServerFn(getAgentDesk);
  const dial = useServerFn(dialFromCrm);
  const control = useServerFn(controlLiveCall);
  const disposition = useServerFn(submitDisposition);
  const saveContact = useServerFn(saveCrmContact);
  const callback = useServerFn(scheduleCallback);
  const sendSms = useServerFn(sendCallToolsSms);

  const desk = useQuery({
    queryKey: ["agent-desk"],
    queryFn: () => loadDesk(),
    refetchInterval: 15_000,
  });

  const [number, setNumber] = useState("");
  const [dispoFor, setDispoFor] = useState<{ callUuid: string; phone: string | null } | null>(null);
  const [dispoId, setDispoId] = useState("");
  const [dispoNotes, setDispoNotes] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [contact, setContact] = useState({ fullName: "", phone: "", email: "", state: "" });
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [cb, setCb] = useState({ phone: "", contactName: "", scheduledAt: "", notes: "" });
  const [smsOpen, setSmsOpen] = useState(false);
  const [sms, setSms] = useState({ phone: "", body: "" });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["agent-desk"] });

  const dialMutation = useMutation({
    mutationFn: (input: { phone: string; queueItemId?: string }) => dial({ data: input }),
    onSuccess: (res) => {
      if (res.dialing) toast.success(`Ringing ${res.phone}`);
      else toast.warning(`Queued for CallTools — ${explainFailure(res.error)}`);
      setNumber("");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const controlMutation = useMutation({
    mutationFn: (input: { callUuid: string; action: "hangup" | "transfer" }) => control({ data: input }),
    onSuccess: (res, vars) => {
      if (res.applied) toast.success(vars.action === "hangup" ? "Call ended" : "Call transferred");
      else toast.warning(explainFailure(res.error));
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const dispoMutation = useMutation({
    mutationFn: () =>
      disposition({
        data: {
          callUuid: dispoFor?.callUuid ?? "",
          dispositionId: dispoId,
          ...(dispoNotes ? { notes: dispoNotes } : {}),
          ...(dispoFor?.phone ? { phone: dispoFor.phone } : {}),
        },
      }),
    onSuccess: (res) => {
      toast[res.saved ? "success" : "warning"](
        res.saved ? `Saved as “${res.disposition}”` : `Queued — ${explainFailure(res.error)}`,
      );
      setDispoFor(null);
      setDispoId("");
      setDispoNotes("");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const contactMutation = useMutation({
    mutationFn: () => saveContact({ data: contact }),
    onSuccess: (res) => {
      toast[res.saved ? "success" : "warning"](
        res.saved ? "Contact saved in the CRM and CallTools" : `Saved here, queued for CallTools`,
      );
      setContactOpen(false);
      setContact({ fullName: "", phone: "", email: "", state: "" });
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const callbackMutation = useMutation({
    mutationFn: () => callback({ data: cb }),
    onSuccess: () => {
      toast.success("Callback scheduled");
      setCallbackOpen(false);
      setCb({ phone: "", contactName: "", scheduledAt: "", notes: "" });
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const smsMutation = useMutation({
    mutationFn: () => sendSms({ data: sms }),
    onSuccess: (res) => {
      toast[res.sent ? "success" : "warning"](res.sent ? "Text sent" : "Text queued");
      setSmsOpen(false);
      setSms({ phone: "", body: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const data = desk.data;
  const liveCall = data?.live?.[0] ?? null;
  const undisposed = useMemo(
    () => (data?.calls ?? []).filter((c) => c.ended_at && !c.disposition),
    [data?.calls],
  );

  const readyToDial = Boolean(data?.settings.dialEnabled && data?.linked);

  return (
    <div className="space-y-4">
      {!data?.linked && !desk.isLoading && (
        <Card className="flex flex-wrap items-center gap-3 border-warning/40 bg-warning/10 p-4">
          <WifiOff className="size-4 text-warning" />
          <p className="text-sm text-muted-foreground">
            Your CallTools seat is not linked to this account yet, so dialing and status sync are paused. An
            administrator can link it on the CallTools control page.
          </p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Calls today"
          value={data?.totals.calls ?? "—"}
          tone="brand"
          hint={`${data?.totals.connected ?? 0} connected`}
        />
        <StatCard label="Talk time" value={data ? hhmm(data.totals.talkSeconds) : "—"} tone="info" />
        <StatCard
          label="Needs a disposition"
          value={undisposed.length}
          tone={undisposed.length ? "warning" : "success"}
          hint="Wrap these up before your shift ends"
        />
        <StatCard
          label="Web phone"
          value={data?.webPhoneStatus ?? (data?.linked ? "Not registered" : "—")}
          tone={data?.webPhoneStatus ? "success" : "default"}
          hint={data?.providerAgentName ?? "CallTools seat"}
          icon={data?.webPhoneStatus ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Dial a number</h2>
            <Button variant="ghost" size="sm" onClick={refresh} disabled={desk.isFetching}>
              <RefreshCw className={desk.isFetching ? "size-4 animate-spin" : "size-4"} /> Refresh
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="(555) 010-4477"
              className="max-w-xs"
              inputMode="tel"
            />
            <Button
              onClick={() => dialMutation.mutate({ phone: number })}
              disabled={number.replace(/\D/g, "").length < 10 || dialMutation.isPending || !readyToDial}
            >
              {dialMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <PhoneCall className="size-4" />}
              Call
            </Button>
            <Button variant="outline" onClick={() => setContactOpen(true)}>
              <UserPlus className="size-4" /> New contact
            </Button>
            <Button variant="outline" onClick={() => setCallbackOpen(true)}>
              <PhoneForwarded className="size-4" /> Schedule callback
            </Button>
            <Button variant="outline" onClick={() => setSmsOpen(true)}>
              <Send className="size-4" /> Send text
            </Button>
          </div>
          {!readyToDial && (
            <p className="mt-2 text-xs text-muted-foreground">
              {data?.settings.dialEnabled === false
                ? "Calling from the CRM is switched off in settings."
                : "Dialing unlocks once your CallTools seat is linked."}
            </p>
          )}

          <div className="mt-4 rounded-md border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Live call</p>
              {liveCall && <Badge variant="secondary">{liveCall.status ?? "In progress"}</Badge>}
            </div>
            {liveCall ? (
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground">
                  {liveCall.to ?? liveCall.from ?? "Unknown number"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {liveCall.direction ?? "outbound"} · {liveCall.campaign ?? "No campaign"} · started{" "}
                  {timeLabel(liveCall.startedAt)} · {hhmm(liveCall.seconds)}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => controlMutation.mutate({ callUuid: liveCall.callUuid, action: "hangup" })}
                  >
                    <PhoneOff className="size-4" /> End call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => controlMutation.mutate({ callUuid: liveCall.callUuid, action: "transfer" })}
                  >
                    <PhoneForwarded className="size-4" /> Transfer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDispoFor({ callUuid: liveCall.callUuid, phone: liveCall.to ?? liveCall.from ?? null })
                    }
                  >
                    Disposition
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {data?.liveError
                  ? explainFailure(data.liveError)
                  : "No call in progress. Dial a number or take one from your callback list."}
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">My status</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Changing it here also changes it in CallTools, so the dialer stops sending you calls.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["Available", "Break", "Lunch", "Meeting", "Training", "Not Available"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={status === s ? "default" : "outline"}
                onClick={() => setStatus(s)}
              >
                {s === "Break" || s === "Lunch" ? <Coffee className="size-4" /> : null}
                {s}
              </Button>
            ))}
          </div>
          <div className="mt-3 rounded-md border border-border p-3 text-xs text-muted-foreground">
            CallTools shows you as{" "}
            <span className="font-medium text-foreground">{data?.providerStatus ?? "unknown"}</span>
            {data?.settings.statusSyncEnabled === false && " · status sync is switched off"}
          </div>

          <h3 className="mt-4 mb-2 text-sm font-semibold text-foreground">My callbacks</h3>
          <div className="space-y-2">
            {(data?.queue ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">Nothing scheduled.</p>
            )}
            {(data?.queue ?? []).slice(0, 6).map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{q.contact_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.phone_e164} · {timeLabel(q.scheduled_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!readyToDial}
                  onClick={() => dialMutation.mutate({ phone: q.phone_e164 ?? "", queueItemId: q.id })}
                >
                  <PhoneCall className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Today’s calls</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Number</th>
                <th className="py-2 pr-3">Direction</th>
                <th className="py-2 pr-3">Talk</th>
                <th className="py-2 pr-3">Outcome</th>
                <th className="py-2 pr-3">Recording</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {(data?.calls ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    No calls yet today.
                  </td>
                </tr>
              )}
              {(data?.calls ?? []).map((c) => (
                <tr key={c.id} className="border-b border-border/60">
                  <td className="py-2 pr-3 text-muted-foreground">{timeLabel(c.started_at)}</td>
                  <td className="py-2 pr-3 font-medium text-foreground">
                    {c.lead_phone_e164 ?? c.to_number ?? c.from_number ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{c.direction ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{hhmm(c.talk_seconds ?? 0)}</td>
                  <td className="py-2 pr-3">
                    {c.disposition ? (
                      <Badge variant="secondary">{c.disposition}</Badge>
                    ) : (
                      <Badge variant="outline">Needs outcome</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {c.recording_url ? (
                      <a
                        className="text-xs font-medium text-brand underline"
                        href={c.recording_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Listen
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDispoFor({
                            callUuid: c.provider_call_id,
                            phone: c.lead_phone_e164 ?? c.to_number ?? null,
                          })
                        }
                      >
                        Disposition
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!readyToDial}
                        onClick={() =>
                          dialMutation.mutate({
                            phone: c.lead_phone_e164 ?? c.to_number ?? c.from_number ?? "",
                          })
                        }
                      >
                        <PhoneCall className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Disposition prompt */}
      <Dialog open={Boolean(dispoFor)} onOpenChange={(o) => !o && setDispoFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call outcome</DialogTitle>
            <DialogDescription>
              This writes back to CallTools so reporting on both sides matches.
              {dispoFor?.phone ? ` Number: ${dispoFor.phone}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block">Disposition</Label>
              <Select value={dispoId} onValueChange={setDispoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an outcome" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.dispositions ?? []).map((d) => (
                    <SelectItem key={d.provider_disposition_id} value={d.provider_disposition_id}>
                      {d.name}
                      {d.is_sale ? " · sale" : d.is_callback ? " · callback" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(data?.dispositions ?? []).length === 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  No dispositions synced yet — an administrator can pull them from CallTools.
                </p>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block">Notes</Label>
              <Textarea
                value={dispoNotes}
                onChange={(e) => setDispoNotes(e.target.value)}
                placeholder="What happened on the call?"
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              disabled={!dispoId || dispoMutation.isPending}
              onClick={() => dispoMutation.mutate()}
            >
              {dispoMutation.isPending && <Loader2 className="size-4 animate-spin" />} Save outcome
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New contact */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New contact</DialogTitle>
            <DialogDescription>Saved in the CRM and pushed to CallTools.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block">Full name</Label>
              <Input value={contact.fullName} onChange={(e) => setContact({ ...contact, fullName: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">Phone</Label>
                <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">State</Label>
                <Input value={contact.state} onChange={(e) => setContact({ ...contact, state: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            </div>
            <Button
              className="w-full"
              disabled={!contact.fullName || contact.phone.replace(/\D/g, "").length < 10 || contactMutation.isPending}
              onClick={() => contactMutation.mutate()}
            >
              Save contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Callback */}
      <Dialog open={callbackOpen} onOpenChange={setCallbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule a callback</DialogTitle>
            <DialogDescription>Added to your queue here and to the CallTools callback list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">Phone</Label>
                <Input value={cb.phone} onChange={(e) => setCb({ ...cb, phone: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Name</Label>
                <Input value={cb.contactName} onChange={(e) => setCb({ ...cb, contactName: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">When</Label>
              <Input
                type="datetime-local"
                value={cb.scheduledAt}
                onChange={(e) => setCb({ ...cb, scheduledAt: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Notes</Label>
              <Textarea value={cb.notes} onChange={(e) => setCb({ ...cb, notes: e.target.value })} rows={2} />
            </div>
            <Button
              className="w-full"
              disabled={!cb.scheduledAt || cb.phone.replace(/\D/g, "").length < 10 || callbackMutation.isPending}
              onClick={() => callbackMutation.mutate()}
            >
              Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS */}
      <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a text</DialogTitle>
            <DialogDescription>Sent through the CallTools number attached to your seat.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block">Phone</Label>
              <Input value={sms.phone} onChange={(e) => setSms({ ...sms, phone: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Message</Label>
              <Textarea value={sms.body} onChange={(e) => setSms({ ...sms, body: e.target.value })} rows={4} />
            </div>
            <Button
              className="w-full"
              disabled={!sms.body || sms.phone.replace(/\D/g, "").length < 10 || smsMutation.isPending}
              onClick={() => smsMutation.mutate()}
            >
              Send text
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
