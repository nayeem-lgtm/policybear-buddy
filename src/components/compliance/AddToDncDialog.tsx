/**
 * Quick "add this number to the DNC list" dialog, reusable from the dialer,
 * the live call panel and any contact row.
 */

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Ban } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DNC_REASONS, DNC_SCOPES } from "@/lib/dnc-shared";
import { addDncNumber } from "@/lib/dnc.functions";

export function AddToDncDialog({
  open,
  onOpenChange,
  phone,
  contactName,
  source = "manual",
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone?: string | null;
  contactName?: string | null;
  source?: string;
  onAdded?: () => void;
}) {
  const queryClient = useQueryClient();
  const add = useServerFn(addDncNumber);
  const [value, setValue] = useState(phone ?? "");
  const [name, setName] = useState(contactName ?? "");
  const [reason, setReason] = useState<string>(DNC_REASONS[0]);
  const [scope, setScope] = useState<string>("internal");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(phone ?? "");
    setName(contactName ?? "");
  }, [open, phone, contactName]);

  const mutation = useMutation({
    mutationFn: () =>
      add({
        data: {
          phone: value,
          reason,
          scope: scope as (typeof DNC_SCOPES)[number],
          source,
          ...(name ? { contactName: name } : {}),
          ...(notes ? { notes } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Added to the Do-Not-Call list — future dials are blocked");
      setNotes("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["dnc-center"] });
      queryClient.invalidateQueries({ queryKey: ["dnc-blocked"] });
      queryClient.invalidateQueries({ queryKey: ["dnc-check"] });
      onAdded?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Do-Not-Call</DialogTitle>
          <DialogDescription>
            The number is suppressed everywhere immediately and the action is written to the compliance
            audit log with your name.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Phone number</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="(555) 010-1234" />
          </div>
          <div className="grid gap-1.5">
            <Label>Contact name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DNC_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DNC_SCOPES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Notes (optional)</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={value.replace(/\D/g, "").length < 7 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <Ban className="mr-2 size-4" /> Add to DNC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
