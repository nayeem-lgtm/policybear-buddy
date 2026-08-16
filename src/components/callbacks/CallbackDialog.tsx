/**
 * Premium "set a callback" dialog. Reusable from the dialer, the live call
 * panel, the callback book and any contact row. Writes straight into the
 * callback book so scheduled follow-ups appear on the queue and calendar.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCallback, updateCallback } from "@/lib/dialer.functions";
import { cn } from "@/lib/utils";

export const CALLBACK_REASONS = [
  "Requested callback",
  "Needs quote comparison",
  "Decision maker unavailable",
  "Payment / billing follow-up",
  "Documents pending",
  "Voicemail left",
  "Bad timing — call later",
] as const;

/** local datetime string the <input type="datetime-local"> understands */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inMinutes(minutes: number): string {
  return toLocalInput(new Date(Date.now() + minutes * 60_000));
}

function tomorrowAt(hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return toLocalInput(d);
}

export function CallbackDialog({
  open,
  onOpenChange,
  phone,
  contactName,
  /** when set the dialog reschedules an existing callback instead of creating one */
  callbackId,
  defaultReason,
  defaultScheduledAt,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone?: string | null;
  contactName?: string | null;
  callbackId?: string | null;
  defaultReason?: string | null;
  defaultScheduledAt?: string | null;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const book = useServerFn(createCallback);
  const patch = useServerFn(updateCallback);

  const [value, setValue] = useState(phone ?? "");
  const [name, setName] = useState(contactName ?? "");
  const [reason, setReason] = useState<string>(defaultReason ?? CALLBACK_REASONS[0]);
  const [when, setWhen] = useState<string>(defaultScheduledAt ?? inMinutes(60));
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(phone ?? "");
    setName(contactName ?? "");
    setReason(defaultReason ?? CALLBACK_REASONS[0]);
    setWhen(defaultScheduledAt ?? inMinutes(60));
    setDetail("");
  }, [open, phone, contactName, defaultReason, defaultScheduledAt]);

  const presets = useMemo(
    () => [
      { label: "In 15 min", value: inMinutes(15) },
      { label: "In 1 hour", value: inMinutes(60) },
      { label: "In 3 hours", value: inMinutes(180) },
      { label: "Tomorrow 9:00", value: tomorrowAt(9) },
      { label: "Tomorrow 14:00", value: tomorrowAt(14) },
    ],
    [open], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const save = useMutation({
    mutationFn: async () => {
      if (callbackId) {
        return patch({ data: { id: callbackId, scheduledAt: when, status: "Scheduled" } });
      }
      return book({
        data: {
          phone: value,
          contactName: name || undefined,
          reason,
          detail: detail || undefined,
          scheduledAt: when || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success(callbackId ? "Callback rescheduled" : "Callback set — it's in the callback book");
      void queryClient.invalidateQueries({ queryKey: ["callback-book"] });
      void queryClient.invalidateQueries({ queryKey: ["dialer-desk"] });
      onSaved?.();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = callbackId ? Boolean(when) : value.replace(/\D/g, "").length >= 7 && Boolean(reason);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-brand" />
            {callbackId ? "Reschedule callback" : "Set a callback"}
          </DialogTitle>
          <DialogDescription>
            {callbackId
              ? "Pick a new slot — the queue and calendar update instantly."
              : "Book the follow-up now and it lands in the callback book with a live countdown."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!callbackId && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cb-phone">Phone number</Label>
                  <Input
                    id="cb-phone"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="+1 555 010 1234"
                    inputMode="tel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cb-name">Customer name</Label>
                  <Input
                    id="cb-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-muted-foreground" /> Reason
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {CALLBACK_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        reason === r
                          ? "border-brand bg-brand/12 font-medium text-brand"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Or type your own reason"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5" htmlFor="cb-when">
              <Clock className="size-3.5 text-muted-foreground" /> When
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setWhen(p.value)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    when === p.value
                      ? "border-brand bg-brand/12 font-medium text-brand"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Input
              id="cb-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>

          {!callbackId && (
            <div className="space-y-1.5">
              <Label htmlFor="cb-detail">Notes for the next agent</Label>
              <Textarea
                id="cb-detail"
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Context, quotes discussed, objections…"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            <CalendarClock className="mr-2 size-4" />
            {callbackId ? "Reschedule" : "Set callback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
