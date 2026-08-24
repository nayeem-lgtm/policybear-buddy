/**
 * Read-only agent call script. The agent reads the script here and types lead
 * details manually in the lead intake panel — no capture fields inside the script.
 */

import { useEffect, useRef, useState } from "react";
import {
  BookOpenText,
  Lock,
  OctagonAlert,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";


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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SCRIPT_INTERNAL_WHY, SCRIPT_PHASES, SCRIPT_RULES } from "@/lib/call-script";
import { cn } from "@/lib/utils";

export function CallScriptDialog({
  trigger,
  className,
}: {
  trigger?: React.ReactNode;
  className?: string;
  /** kept for call-site compatibility; the script itself is read-only */
  phone?: string;
  contactName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(SCRIPT_PHASES[0]?.id ?? "");

  const goTo = (id: string) => {
    setActive(id);
    document.getElementById(`script-phase-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        <DialogHeader className="border-b border-border/60 p-4 text-center">
          <DialogTitle className="font-display text-2xl tracking-tight text-brand">
            POLICY BEAR
          </DialogTitle>
          <DialogDescription className="text-sm font-semibold text-brand-tan">
            Inbound Final Expense — Agent Call Script
          </DialogDescription>
          <p className="text-xs text-muted-foreground">
            CEO Approved · Agent-Ready Version 1.3 · Follow in Order · Do Not Skip Compliance Flags
          </p>
        </DialogHeader>

        <div className="grid max-h-[76vh] grid-cols-1 lg:grid-cols-[220px_1fr]">
          <aside className="hidden border-r border-border/60 bg-surface/40 lg:block">
            <ScrollArea className="h-[76vh] p-2">
              <div className="space-y-1">
                {SCRIPT_PHASES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => goTo(p.id)}
                    className={cn(
                      "w-full truncate rounded-xl px-3 py-2 text-left text-xs transition",
                      p.id === active
                        ? "bg-brand/12 font-semibold text-brand"
                        : "text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>

          <ScrollArea className="h-[76vh]">
            <div className="space-y-5 p-5">
              <div className="rounded-2xl border border-destructive/30 bg-destructive/8 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-destructive">
                  <ShieldAlert className="size-3.5" /> Two strict company rules — follow exactly
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                  {SCRIPT_RULES.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="flex gap-2 rounded-2xl border border-warning/40 bg-warning/12 p-3 text-xs text-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  <span className="font-semibold">Why this payment rule exists — internal note.</span>{" "}
                  {SCRIPT_INTERNAL_WHY}
                </span>
              </p>

              {SCRIPT_PHASES.map((phase) => (
                <section key={phase.id} id={`script-phase-${phase.id}`} className="space-y-3">
                  <div>
                    <p className="font-display text-base font-semibold uppercase tracking-[0.06em] text-brand">
                      {phase.title}
                    </p>
                    {phase.subtitle ? (
                      <p className="text-xs italic text-muted-foreground">{phase.subtitle}</p>
                    ) : null}
                  </div>
                  <Separator />

                  {phase.steps.map((step) => (
                    <div key={step.id} className="space-y-2">
                      {step.stop ? (
                        <p className="flex gap-2 rounded-xl border border-warning/40 bg-warning/12 p-2.5 text-xs font-medium">
                          <OctagonAlert className="mt-0.5 size-3.5 shrink-0 text-brand-tan" />
                          {step.stop}
                        </p>
                      ) : null}

                      {(step.say ?? []).map((line) => (
                        <p
                          key={line}
                          className="rounded-xl border border-brand/25 bg-brand/8 p-2.5 text-sm italic"
                        >
                          <Badge variant="secondary" className="mr-2 align-middle text-[0.6rem]">
                            SAY
                          </Badge>
                          {line}
                        </p>
                      ))}

                      {step.bullets?.length ? (
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {step.bullets.map((b) => (
                            <li key={b} className="flex gap-2">
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {step.note ? (
                        <p className="rounded-xl bg-muted/60 p-2 text-xs text-muted-foreground">
                          {step.note}
                        </p>
                      ) : null}

                      {step.internal ? (
                        <p className="flex gap-2 rounded-xl border border-warning/40 bg-warning/12 p-2 text-xs">
                          <Badge variant="secondary" className="h-4 shrink-0 text-[0.6rem]">
                            INTERNAL
                          </Badge>
                          {step.internal}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
