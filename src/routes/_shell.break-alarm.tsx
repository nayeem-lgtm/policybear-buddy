import { createFileRoute } from "@tanstack/react-router";
import {
  AlarmClock,
  BellRing,
  Coffee,
  Gauge,
  Minus,
  PhoneCall,
  Play,
  Plus,
  RotateCcw,
  Sandwich,
  Save,
  ShieldAlert,
  Square,
  Timer,
  Volume2,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Timeline } from "@/components/crm/Timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { formatDuration, useShift } from "@/context/ShiftContext";

export const Route = createFileRoute("/_shell/break-alarm")({
  head: () => ({
    meta: [
      { title: "Break Alarm & Auto-Call Control — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Configure break and lunch allowances, overrun escalation thresholds, the red alarm overlay and automatic supervisor call ring.",
      },
      { property: "og:title", content: "Break Alarm & Auto-Call Control — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Set break thresholds, test the red alarm overlay and control auto-call escalation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BreakAlarmControlPage,
});

/* ---------- building blocks ---------- */

function Ring({
  value,
  size = 116,
  stroke = 10,
  tone = "info",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "info" | "danger" | "warning";
  children: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const toneClass = {
    info: "text-brand-cyan",
    warning: "text-warning",
    danger: "text-destructive",
  }[tone];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="stroke-brand-foreground/20"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn("transition-[stroke-dashoffset] duration-700", toneClass)}
          stroke="currentColor"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon,
  accent = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: "default" | "brand" | "info" | "warning" | "danger";
}) {
  const accentClass = {
    default: "bg-muted text-muted-foreground",
    brand: "bg-brand/10 text-brand",
    info: "bg-brand-cyan/25 text-brand-teal",
    warning: "bg-warning/25 text-brand-tan",
    danger: "bg-destructive/12 text-destructive",
  }[accent];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 transition-colors hover:border-brand/30">
      {icon && (
        <span
          className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", accentClass)}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
        <div className="tabular mt-0.5 truncate font-display text-lg leading-tight font-semibold text-foreground">
          {value}
        </div>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function MinutesStepper({
  id,
  label,
  hint,
  icon,
  seconds,
  onChange,
  step = 1,
}: {
  id: string;
  label: string;
  hint: string;
  icon: ReactNode;
  seconds: number;
  onChange: (seconds: number) => void;
  step?: number;
}) {
  const minutes = Math.round((seconds / 60) * 100) / 100;
  const bump = (delta: number) => onChange(Math.max(0, (minutes + delta) * 60));

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 transition-colors hover:border-brand/30">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <Label htmlFor={id} className="text-sm font-semibold text-foreground">
            {label}
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 rounded-xl"
          aria-label={`Decrease ${label}`}
          onClick={() => bump(-step)}
        >
          <Minus className="size-4" />
        </Button>
        <div className="relative flex-1">
          <Input
            id={id}
            type="number"
            min={0}
            step={step}
            className="tabular h-9 rounded-xl pr-14 text-center font-semibold"
            value={minutes}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value) * 60))}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
            min
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 rounded-xl"
          aria-label={`Increase ${label}`}
          onClick={() => bump(step)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  copy,
  icon,
  checked,
  onChange,
}: {
  title: string;
  copy: string;
  icon: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 rounded-2xl border p-4 transition-all",
        checked ? "border-brand/40 bg-brand/6" : "border-border/60 bg-card/70",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
            checked ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{copy}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </span>
      <div>
        <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

/* ---------- page ---------- */

function BreakAlarmControlPage() {
  const {
    config,
    updateConfig,
    resetConfig,
    status,
    statusSeconds,
    allowanceSeconds,
    overrunSeconds,
    alarmActive,
    autoCallRinging,
    escalated,
    testing,
    startAlarmTest,
    stopAlarmTest,
    demoMode,
    setDemoMode,
    events,
  } = useShift();

  const alarmState = !config.alarmEnabled
    ? "Paused"
    : alarmActive
      ? "Critical"
      : testing
        ? "In Progress"
        : "Active";

  const onAllowance = allowanceSeconds !== null;
  const usedPct = onAllowance
    ? Math.min(100, (statusSeconds / Math.max(1, statusSeconds + allowanceSeconds)) * 100)
    : config.alarmEnabled
      ? 100
      : 0;
  const ringTone = overrunSeconds > 0 ? "danger" : onAllowance ? "warning" : "info";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <Card className="brand-gradient relative gap-0 overflow-hidden rounded-3xl border-0 p-0 text-brand-foreground shadow-raised">
        <div className="brand-mesh absolute inset-0 opacity-90" aria-hidden />
        <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <Ring value={usedPct} tone={ringTone}>
              <span className="tabular font-display text-xl leading-none font-semibold text-brand-foreground">
                {onAllowance ? formatDuration(allowanceSeconds) : "—"}
              </span>
              <span className="mt-1 text-[0.6rem] tracking-[0.14em] text-brand-foreground/60 uppercase">
                {onAllowance ? "left" : "standby"}
              </span>
            </Ring>
            <div className="space-y-2">
              <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-brand-foreground/60 uppercase">
                Attendance · alarm engine
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={alarmState} />
                <span className="tabular rounded-full bg-brand-foreground/12 px-2.5 py-1 text-xs font-medium text-brand-foreground/85">
                  {status} · {formatDuration(statusSeconds)}
                </span>
                <span className="rounded-full bg-brand-foreground/12 px-2.5 py-1 text-xs font-medium text-brand-foreground/85">
                  {config.soundEnabled ? "Siren on" : "Silent mode"}
                </span>
              </div>
              <p className="max-w-lg text-sm text-brand-foreground/70">
                Set allowance and escalation thresholds, rehearse the red overrun overlay, and
                control the automatic supervisor call ring.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="rounded-xl text-brand-foreground hover:bg-brand-foreground/12 hover:text-brand-foreground"
              onClick={resetConfig}
            >
              <RotateCcw className="size-4" /> Restore defaults
            </Button>
            <Button
              size="lg"
              className="rounded-xl bg-brand-foreground text-brand hover:bg-brand-foreground/90"
              onClick={() => toast.success("Alarm policy saved for the Sales floor")}
            >
              <Save className="size-4" /> Save policy
            </Button>
          </div>
        </div>

        {overrunSeconds > 0 && (
          <div className="relative border-t border-brand-foreground/15 bg-destructive/85 px-6 py-2.5 text-xs font-medium">
            Overrun +{formatDuration(overrunSeconds)} —{" "}
            {autoCallRinging
              ? "supervisor auto-call is ringing"
              : escalated
                ? "HR escalation reached"
                : "return to Available to clear the alarm"}
            .
          </div>
        )}
      </Card>

      {/* Quick metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Break allowance"
          value={`${Math.round(config.breakAllowanceSeconds / 60)}m`}
          hint="Per break, twice daily"
          icon={<Coffee className="size-4" />}
          accent="warning"
        />
        <MetricTile
          label="Lunch allowance"
          value={`${Math.round(config.lunchAllowanceSeconds / 60)}m`}
          hint="Single lunch window"
          icon={<Sandwich className="size-4" />}
          accent="warning"
        />
        <MetricTile
          label="Auto-call after"
          value={formatDuration(config.autoCallAfterSeconds)}
          hint={config.autoCallEnabled ? config.supervisor : "Auto-call disabled"}
          icon={<PhoneCall className="size-4" />}
          accent={config.autoCallEnabled ? "brand" : "default"}
        />
        <MetricTile
          label="Current overrun"
          value={`+${formatDuration(overrunSeconds)}`}
          hint={escalated ? "HR escalation reached" : "Within tolerance"}
          icon={<Gauge className="size-4" />}
          accent={overrunSeconds > 0 ? "danger" : "info"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <Card className="gap-4 rounded-3xl p-5 shadow-card">
            <SectionTitle
              icon={<Timer className="size-4" />}
              title="Thresholds"
              description="Applied to every agent on the standard 07:00–16:00 Pacific shift."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <MinutesStepper
                id="break-allowance"
                label="Break allowance"
                hint="Breaks at 09:00 and 13:30 · default 15m"
                icon={<Coffee className="size-4" />}
                seconds={config.breakAllowanceSeconds}
                onChange={(s) => updateConfig({ breakAllowanceSeconds: s })}
              />
              <MinutesStepper
                id="lunch-allowance"
                label="Lunch allowance"
                hint="Lunch at 11:00 · default 30m"
                icon={<Sandwich className="size-4" />}
                seconds={config.lunchAllowanceSeconds}
                onChange={(s) => updateConfig({ lunchAllowanceSeconds: s })}
              />
              <MinutesStepper
                id="auto-call"
                label="Auto-call after overrun"
                hint="Supervisor auto-dial threshold · default 2m"
                icon={<PhoneCall className="size-4" />}
                seconds={config.autoCallAfterSeconds}
                step={0.5}
                onChange={(s) => updateConfig({ autoCallAfterSeconds: s })}
              />
              <MinutesStepper
                id="escalate"
                label="HR escalation after overrun"
                hint="Team lead + HR notified · default 5m"
                icon={<ShieldAlert className="size-4" />}
                seconds={config.escalateAfterSeconds}
                step={0.5}
                onChange={(s) => updateConfig({ escalateAfterSeconds: s })}
              />
            </div>
          </Card>

          <Card className="gap-4 rounded-3xl p-5 shadow-card">
            <SectionTitle
              icon={<BellRing className="size-4" />}
              title="Behaviour"
              description="Controls what the agent sees and hears when an allowance is exceeded."
            />
            <div className="grid gap-3">
              <ToggleRow
                title="Red screen alarm"
                copy="Full-screen red overlay locks the agent's workspace on overrun."
                icon={<AlarmClock className="size-4" />}
                checked={config.alarmEnabled}
                onChange={(v) => updateConfig({ alarmEnabled: v })}
              />
              <ToggleRow
                title="Audible siren"
                copy="Repeating tone plays while the overlay is active."
                icon={<Volume2 className="size-4" />}
                checked={config.soundEnabled}
                onChange={(v) => updateConfig({ soundEnabled: v })}
              />
              <ToggleRow
                title="Automatic supervisor call ring"
                copy={`Auto-dials the agent from ${config.supervisor} through CallTools.`}
                icon={<PhoneCall className="size-4" />}
                checked={config.autoCallEnabled}
                onChange={(v) => updateConfig({ autoCallEnabled: v })}
              />
              <ToggleRow
                title="Allow acknowledge & dismiss"
                copy="When off, the overlay can only be cleared by returning to Available."
                icon={<ShieldAlert className="size-4" />}
                checked={config.allowAcknowledge}
                onChange={(v) => updateConfig({ allowAcknowledge: v })}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="gap-4 rounded-3xl p-5 shadow-card">
            <SectionTitle
              icon={<Play className="size-4" />}
              title="Test the alarm"
              description="Rehearsal runs on your own session only — no exception is recorded."
            />
            {testing ? (
              <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/8 p-4">
                <p className="text-sm text-foreground">
                  Test running · overrun{" "}
                  <span className="tabular font-semibold">+{formatDuration(overrunSeconds)}</span>
                </p>
                <Button variant="destructive" className="w-full rounded-xl" onClick={stopAlarmTest}>
                  <Square className="size-4" /> End test & return to Available
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Button className="rounded-xl" onClick={() => startAlarmTest("Break")}>
                  <Play className="size-4" /> Test break overrun
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => startAlarmTest("Lunch")}
                >
                  <Play className="size-4" /> Test lunch overrun
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    updateConfig({ autoCallEnabled: true, alarmEnabled: true });
                    startAlarmTest("Break");
                    toast.info("Auto-call will ring once the overrun threshold is passed");
                  }}
                >
                  <PhoneCall className="size-4" /> Test auto-call ring
                </Button>
              </div>
            )}
            <ToggleRow
              title="Accelerated demo timers"
              copy="Compresses allowances to seconds so escalation can be reviewed quickly."
              icon={<Timer className="size-4" />}
              checked={demoMode}
              onChange={setDemoMode}
            />
          </Card>

          <Card className="gap-4 rounded-3xl p-5 shadow-card">
            <SectionTitle icon={<ShieldAlert className="size-4" />} title="Escalation ladder" />
            <Timeline
              items={[
                {
                  time: "0:00",
                  event: "Allowance exceeded",
                  detail: config.alarmEnabled
                    ? "Red screen alarm + siren on the agent workstation"
                    : "Alarm overlay disabled — overrun logged silently",
                  tone: "danger",
                },
                {
                  time: formatDuration(config.autoCallAfterSeconds),
                  event: "Automatic supervisor call",
                  detail: config.autoCallEnabled
                    ? `${config.supervisor} auto-dials the agent`
                    : "Auto-call disabled",
                  tone: config.autoCallEnabled ? "warning" : "muted",
                },
                {
                  time: formatDuration(config.escalateAfterSeconds),
                  event: "HR notification",
                  detail: "Attendance exception filed for payroll review",
                  tone: "brand",
                },
              ]}
            />
          </Card>

          <Card className="gap-4 rounded-3xl p-5 shadow-card">
            <SectionTitle icon={<Timer className="size-4" />} title="Session log" />
            <Timeline items={events.slice(-6).reverse()} />
          </Card>
        </div>
      </div>
    </div>
  );
}
