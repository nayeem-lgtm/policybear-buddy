/**
 * Pop-up agent call script for the agent desk. Read-only, phase based, always a
 * click away while a call is live.
 */

import { useState } from "react";
import { BookOpenText, CheckCircle2, ShieldAlert } from "lucide-react";

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
import { cn } from "@/lib/utils";

type Line = { kind: "say" | "note" | "bullet"; text: string };
type Phase = { title: string; hint?: string; lines: Line[] };

const RULES = [
  'Policy date: always choose "Check here for date on approval". Never Save Age or a future requested date unless management says so.',
  "Payment method: bank draft is the standard and must be attempted first. Direct billing is an exception only when the start date is immediate / on approval / within one week.",
  "If the caller asks not to be contacted again, run the DNC process immediately.",
];

const PHASES: Phase[] = [
  {
    title: "Phase 1 — Opening & intent",
    hint: "Confirm the caller wants Final Expense before continuing.",
    lines: [
      {
        kind: "say",
        text: "Good morning/afternoon! Thank you for calling Policy Bear. My name is ___, a licensed life insurance agent. Please note this call may be recorded and monitored for quality assurance, training and compliance purposes. Are you looking for life insurance for yourself or a spouse?",
      },
      { kind: "bullet", text: "If YES: “Perfect, I’ll see what options are available for you. It only takes a few minutes.”" },
      { kind: "bullet", text: "If NO: “No problem. This line is for Final Expense life insurance, so I don’t want to waste your time.” Politely end the call." },
      { kind: "say", text: "Great. Approximately how much coverage are you looking for today?" },
    ],
  },
  {
    title: "Phase 2 — Discovery & qualification",
    hint: "Capture everything into the lead card as you go.",
    lines: [
      { kind: "say", text: "May I confirm your full name, date of birth and the state you live in?" },
      { kind: "say", text: "Do you currently use any tobacco products, and are you taking any prescription medications?" },
      { kind: "say", text: "Is this coverage meant mainly for funeral costs, final expenses or leaving something behind for family?" },
      { kind: "note", text: "Log height/weight, medications and hospital history in the lead card health notes." },
    ],
  },
  {
    title: "Phase 3 — Presentation",
    lines: [
      { kind: "say", text: "Based on your age and health, here is what I can approve for you today: ___ of coverage for ___ per month, with benefits starting on approval." },
      { kind: "bullet", text: "Present one recommended plan first — do not overwhelm with options." },
      { kind: "bullet", text: "Restate the monthly premium slowly and confirm affordability." },
    ],
  },
  {
    title: "Phase 4 — Payment & compliance",
    hint: "Bank draft first. Direct billing needs an immediate start date.",
    lines: [
      { kind: "say", text: "To lock this in, we set up a bank draft on the date that works best with your income. Which bank do you use?" },
      { kind: "note", text: "Read the recorded compliance statements exactly. Do not skip any compliance flag." },
      { kind: "bullet", text: "Confirm the beneficiary name and relationship." },
      { kind: "bullet", text: "Confirm the draft date and premium amount before submitting." },
    ],
  },
  {
    title: "Phase 5 — Close & wrap-up",
    lines: [
      { kind: "say", text: "Congratulations — you are approved. You will receive your policy documents shortly. Please keep my name and this number if you need anything." },
      { kind: "bullet", text: "Set the policy delivery date and note it on the lead card." },
      { kind: "bullet", text: "Save the disposition and schedule a follow-up callback if anything is pending." },
    ],
  },
];

export function CallScriptDialog({
  trigger,
  className,
}: {
  trigger?: React.ReactNode;
  className?: string;
}) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className={cn("gap-2", className)}>
            <BookOpenText className="size-4" /> Agent script
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Inbound Final Expense — agent call script
          </DialogTitle>
          <DialogDescription>
            CEO approved · version 1.3 · follow in order · do not skip compliance flags
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-destructive/30 bg-destructive/8 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-destructive">
            <ShieldAlert className="size-3.5" /> Strict company rules
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-foreground">
            {RULES.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <ScrollArea className="h-[52vh] pr-3">
          <div className="space-y-5">
            {PHASES.map((p) => (
              <section key={p.title}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-brand">{p.title}</p>
                    {p.hint ? <p className="text-xs text-muted-foreground">{p.hint}</p> : null}
                  </div>
                  <Button
                    size="sm"
                    variant={done[p.title] ? "default" : "ghost"}
                    className="h-7 shrink-0 gap-1 text-xs"
                    onClick={() => setDone((d) => ({ ...d, [p.title]: !d[p.title] }))}
                  >
                    <CheckCircle2 className="size-3.5" /> {done[p.title] ? "Covered" : "Mark covered"}
                  </Button>
                </div>
                <Separator className="my-2" />
                <div className="space-y-2">
                  {p.lines.map((l) => (
                    <div
                      key={l.text}
                      className={cn(
                        "rounded-xl p-2.5 text-sm",
                        l.kind === "say"
                          ? "border border-brand/25 bg-brand/8 italic"
                          : l.kind === "note"
                            ? "border border-warning/40 bg-warning/12 text-xs"
                            : "text-sm text-muted-foreground",
                      )}
                    >
                      {l.kind === "say" ? (
                        <>
                          <Badge variant="secondary" className="mr-2 align-middle text-[0.6rem]">
                            SAY
                          </Badge>
                          {l.text}
                        </>
                      ) : l.kind === "note" ? (
                        <>
                          <Badge variant="secondary" className="mr-2 align-middle text-[0.6rem]">
                            INTERNAL
                          </Badge>
                          {l.text}
                        </>
                      ) : (
                        <span className="flex gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border" />
                          {l.text}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
