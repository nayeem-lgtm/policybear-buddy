/**
 * Guided agent call script for the agent desk. The agent reads each SAY line
 * and types the answer straight into the capture fields beside it — everything
 * saves into the same lead card record used by the lead intake panel.
 */

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  OctagonAlert,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  SCRIPT_FIELD_COUNT,
  SCRIPT_INTERNAL_WHY,
  SCRIPT_PHASES,
  SCRIPT_RULES,
  type ScriptField,
} from "@/lib/call-script";
import {
  LEAD_CARD_EVENT,
  loadLeadCard,
  saveLeadCard,
  type LeadCardValues,
} from "@/lib/lead-card";
import { cn } from "@/lib/utils";

function CaptureField({
  field,
  value,
  onChange,
}: {
  field: ScriptField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={cn("space-y-1.5", (field.wide || field.kind === "area") && "sm:col-span-2")}>
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      {field.kind === "area" ? (
        <Textarea rows={3} value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : field.kind === "yesno" || field.kind === "choice" ? (
        <div className="flex flex-wrap gap-1.5">
          {(field.kind === "yesno" ? ["Yes", "No"] : (field.options ?? [])).map((opt) => (
            <Button
              key={opt}
              type="button"
              size="sm"
              variant={value === opt ? "default" : "outline"}
              className="h-8 rounded-full text-xs"
              onClick={() => onChange(value === opt ? "" : opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
      ) : (
        <Input
          type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export function CallScriptDialog({
  trigger,
  className,
  phone = "",
  contactName,
}: {
  trigger?: React.ReactNode;
  className?: string;
  phone?: string;
  contactName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [values, setValues] = useState<LeadCardValues>({});
  const [covered, setCovered] = useState<Record<string, boolean>>({});

  // pull the latest lead card whenever the script is opened or the number changes
  useEffect(() => {
    if (!open) return;
    const next = loadLeadCard(phone);
    if (!next["fullName"] && contactName) next["fullName"] = contactName;
    setValues(next);
  }, [open, phone, contactName]);

  const set = (name: string, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      saveLeadCard(phone, next);
      return next;
    });
  };

  // keep in sync if the lead card panel edits the same record
  useEffect(() => {
    if (!open) return;
    const handler = () => setValues(loadLeadCard(phone));
    window.addEventListener(LEAD_CARD_EVENT, handler as EventListener);
    return () => window.removeEventListener(LEAD_CARD_EVENT, handler as EventListener);
  }, [open, phone]);

  const phase = SCRIPT_PHASES[phaseIndex]!;

  const captured = useMemo(
    () =>
      SCRIPT_PHASES.reduce(
        (n, p) =>
          n +
          p.steps.reduce(
            (m, s) => m + (s.fields ?? []).filter((f) => (values[f.name] ?? "").trim()).length,
            0,
          ),
        0,
      ),
    [values],
  );

  const phaseProgress = (p: (typeof SCRIPT_PHASES)[number]) => {
    const fields = p.steps.flatMap((s) => s.fields ?? []);
    if (!fields.length) return covered[p.id] ? 1 : 0;
    return fields.filter((f) => (values[f.name] ?? "").trim()).length / fields.length;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className={cn("gap-2", className)}>
            <BookOpenText className="size-4" /> Agent script
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl gap-0 p-0">
        <DialogHeader className="border-b border-border/60 p-4">
          <DialogTitle className="font-display text-xl">
            Inbound Final Expense — guided call script
          </DialogTitle>
          <DialogDescription>
            CEO approved · version 1.3 · read the blue lines, type the answers as you go — every field
            saves to the lead card automatically.
          </DialogDescription>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Progress value={(captured / SCRIPT_FIELD_COUNT) * 100} className="h-1.5 w-48" />
            <span className="text-xs text-muted-foreground">
              {captured} of {SCRIPT_FIELD_COUNT} script fields captured
            </span>
            <Badge variant="secondary" className="text-[0.65rem]">
              {values["fullName"] || contactName || "New lead"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid max-h-[74vh] grid-cols-1 lg:grid-cols-[240px_1fr]">
          {/* phase rail */}
          <aside className="hidden border-r border-border/60 bg-surface/40 lg:block">
            <ScrollArea className="h-[74vh] p-2">
              <div className="space-y-1">
                {SCRIPT_PHASES.map((p, i) => {
                  const pct = phaseProgress(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPhaseIndex(i)}
                      className={cn(
                        "w-full rounded-xl px-3 py-2 text-left text-xs transition",
                        i === phaseIndex
                          ? "bg-brand/12 font-semibold text-brand"
                          : "text-muted-foreground hover:bg-muted/60",
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        {pct >= 1 ? (
                          <Check className="size-3.5 text-success" />
                        ) : (
                          <span className="size-3.5 shrink-0 rounded-full border border-current opacity-50" />
                        )}
                        <span className="truncate">{p.title}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </aside>

          {/* phase body */}
          <ScrollArea className="h-[74vh]">
            <div className="space-y-4 p-4">
              {phaseIndex === 0 ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/8 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-destructive">
                    <ShieldAlert className="size-3.5" /> Strict company rules
                  </p>
                  <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                    {SCRIPT_RULES.map((r) => (
                      <li key={r} className="flex gap-2">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 flex gap-2 rounded-xl bg-background/60 p-2 text-[0.7rem] text-muted-foreground">
                    <Lock className="mt-0.5 size-3 shrink-0" /> {SCRIPT_INTERNAL_WHY}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-brand">{phase.title}</p>
                  {phase.subtitle ? (
                    <p className="text-xs text-muted-foreground">{phase.subtitle}</p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant={covered[phase.id] ? "default" : "outline"}
                  className="h-8 gap-1 text-xs"
                  onClick={() => setCovered((c) => ({ ...c, [phase.id]: !c[phase.id] }))}
                >
                  <Check className="size-3.5" /> {covered[phase.id] ? "Covered" : "Mark covered"}
                </Button>
              </div>
              <Separator />

              {phase.steps.map((step) => (
                <section key={step.id} className="rounded-2xl border border-border/60 p-3">
                  {step.stop ? (
                    <p className="mb-3 flex gap-2 rounded-xl border border-warning/40 bg-warning/12 p-2.5 text-xs font-medium">
                      <OctagonAlert className="mt-0.5 size-3.5 shrink-0 text-brand-tan" />
                      {step.stop}
                    </p>
                  ) : null}

                  {(step.say ?? []).map((line) => (
                    <p
                      key={line}
                      className="mb-2 rounded-xl border border-brand/25 bg-brand/8 p-2.5 text-sm italic"
                    >
                      <Badge variant="secondary" className="mr-2 align-middle text-[0.6rem]">
                        SAY
                      </Badge>
                      {line}
                    </p>
                  ))}

                  {step.bullets?.length ? (
                    <ul className="mb-2 space-y-1 text-xs text-muted-foreground">
                      {step.bullets.map((b) => (
                        <li key={b} className="flex gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {step.note ? (
                    <p className="mb-2 rounded-xl bg-muted/60 p-2 text-xs text-muted-foreground">
                      {step.note}
                    </p>
                  ) : null}

                  {step.internal ? (
                    <p className="mb-2 flex gap-2 rounded-xl border border-warning/40 bg-warning/12 p-2 text-xs">
                      <Badge variant="secondary" className="h-4 shrink-0 text-[0.6rem]">
                        INTERNAL
                      </Badge>
                      {step.internal}
                    </p>
                  ) : null}

                  {step.fields?.length ? (
                    <div className="mt-3 grid gap-3 rounded-xl bg-surface/50 p-3 sm:grid-cols-2">
                      {step.fields.map((f) => (
                        <CaptureField
                          key={f.name}
                          field={f}
                          value={values[f.name] ?? ""}
                          onChange={(v) => set(f.name, v)}
                        />
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  variant="outline"
                  disabled={phaseIndex === 0}
                  onClick={() => setPhaseIndex((i) => Math.max(0, i - 1))}
                  className="gap-1.5"
                >
                  <ChevronLeft className="size-4" /> Previous phase
                </Button>
                <Button
                  disabled={phaseIndex === SCRIPT_PHASES.length - 1}
                  onClick={() => {
                    setCovered((c) => ({ ...c, [phase.id]: true }));
                    setPhaseIndex((i) => Math.min(SCRIPT_PHASES.length - 1, i + 1));
                  }}
                  className="gap-1.5"
                >
                  Next phase <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
