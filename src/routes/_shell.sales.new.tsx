import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { customers, quotePlans } from "@/lib/mock-data";
import { currency } from "@/lib/use-filters";
import {
  Check,
  ChevronRight,
  Loader2,
  Circle,
  Database,
  Globe,
  Mail,
  FileEdit,
  UploadCloud,
} from "lucide-react";

export const Route = createFileRoute("/_shell/sales/new")({
  head: () => ({
    meta: [
      { title: "New Application — Policy Bear CRM" },
      { name: "description", content: "Guided new application wizard with automated carrier submission bot." },
      { property: "og:title", content: "New Application — Policy Bear CRM" },
      { property: "og:description", content: "Guided new application wizard with automated carrier submission bot." },
    ],
  }),
  component: NewApplicationPage,
});

const steps = ["Applicant", "Household", "Plan", "Payment", "Bot Submission"];

interface BotStep {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const botSteps: BotStep[] = [
  { label: "Fetching CRM data", icon: Database },
  { label: "Opening carrier portal", icon: Globe },
  { label: "Retrieving OTP from email", icon: Mail },
  { label: "Filling application", icon: FileEdit },
  { label: "Submitting", icon: UploadCloud },
];

type BotStatus = "pending" | "running" | "done";

function NewApplicationPage() {
  const [step, setStep] = useState(0);
  const [applicant, setApplicant] = useState(customers[3]!.name);
  const [plan, setPlan] = useState(quotePlans[0]!.id);
  const [statuses, setStatuses] = useState<BotStatus[]>(botSteps.map(() => "pending"));
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selectedPlan = quotePlans.find((p) => p.id === plan) ?? quotePlans[0]!;

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const runBot = () => {
    setRunning(true);
    setFinished(false);
    setStatuses(botSteps.map(() => "pending"));
    let i = 0;
    const advance = () => {
      setStatuses((prev) => prev.map((s, idx) => (idx === i ? "running" : s)));
      timeoutRef.current = setTimeout(() => {
        setStatuses((prev) => prev.map((s, idx) => (idx === i ? "done" : s)));
        i += 1;
        if (i < botSteps.length) {
          advance();
        } else {
          setRunning(false);
          setFinished(true);
        }
      }, 900);
    };
    advance();
  };
  void timeoutRef;

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="New Application"
        description="Walk the applicant through household, plan selection, payment, and automated carrier submission."
      />

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap",
                i === step
                  ? "border-brand bg-brand/10 text-brand"
                  : i < step
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : <span className="tabular">{i + 1}</span>}
              {s}
            </button>
            {i < steps.length - 1 && <ChevronRight className="mx-1 size-3.5 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <Card className="p-5 shadow-card">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Applicant</Label>
              <Select value={applicant} onValueChange={setApplicant}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {customers.slice(0, 12).map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date of birth</Label>
              <Input defaultValue="1988-04-12" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input defaultValue="+1 (713) 555-0142" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input defaultValue="applicant@example.com" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Household size</Label>
              <Input defaultValue="3" />
            </div>
            <div className="space-y-1.5">
              <Label>Annual income</Label>
              <Input defaultValue="$41,200" />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input defaultValue="TX" />
            </div>
            <div className="space-y-1.5">
              <Label>County</Label>
              <Input defaultValue="Harris" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Label>Select plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {quotePlans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.carrier} — {p.planName} ({currency(p.subsidizedPremium)}/mo)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Card className="bg-surface/60 p-4">
              <p className="text-sm font-semibold text-foreground">{selectedPlan.planName}</p>
              <p className="text-xs text-muted-foreground">{selectedPlan.carrier} · {selectedPlan.metal} · {selectedPlan.type}</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{currency(selectedPlan.subsidizedPremium)}/mo</p>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select defaultValue="card">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Debit / Credit card</SelectItem>
                  <SelectItem value="ach">Bank draft (ACH)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Card / account number</Label>
              <Input defaultValue="•••• •••• •••• 4471" />
            </div>
            <div className="space-y-1.5">
              <Label>Billing ZIP</Label>
              <Input defaultValue="77042" />
            </div>
            <div className="space-y-1.5">
              <Label>First draft date</Label>
              <Input defaultValue="2026-09-01" />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Automated submission bot</p>
                <p className="text-xs text-muted-foreground">
                  Agents never enter a carrier OTP manually — the bot retrieves it from the shared inbox automatically.
                </p>
              </div>
              <Button size="sm" onClick={runBot} disabled={running} className="gap-1.5">
                {running ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {finished ? "Run again" : running ? "Running…" : "Run submission"}
              </Button>
            </div>
            <Separator />
            <div className="space-y-2">
              {botSteps.map((b, i) => {
                const status = statuses[i];
                const Icon = b.icon;
                return (
                  <div
                    key={b.label}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 transition-colors",
                      status === "done" && "border-success/30 bg-success/5",
                      status === "running" && "border-brand/30 bg-brand/5",
                      status === "pending" && "border-border",
                    )}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="flex-1 text-sm text-foreground">{b.label}</span>
                    {status === "done" && <Check className="size-4 text-success" />}
                    {status === "running" && <Loader2 className="size-4 animate-spin text-brand" />}
                    {status === "pending" && <Circle className="size-3.5 text-muted-foreground" />}
                  </div>
                );
              })}
            </div>
            {finished && (
              <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
                Application submitted to {selectedPlan.carrier}. Confirmation number PB-CNF-{selectedPlan.id.slice(-3)}829.
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={back} disabled={step === 0}>Back</Button>
        {step < steps.length - 1 ? (
          <Button onClick={next}>Continue</Button>
        ) : (
          <Button disabled={!finished}>Finish & save policy</Button>
        )}
      </div>
    </div>
  );
}
