import { createFileRoute } from "@tanstack/react-router";
import { AlarmClock, PhoneCall, Play, RotateCcw, Save, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Timeline } from "@/components/crm/Timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
    ],
  }),
  component: BreakAlarmControlPage,
});

function MinutesField({
  id,
  label,
  hint,
  seconds,
  onChange,
  step = 1,
}: {
  id: string;
  label: string;
  hint: string;
  seconds: number;
  onChange: (seconds: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min={0}
          step={step}
          className="h-9 w-24 tabular"
          value={Math.round((seconds / 60) * 100) / 100}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) * 60))}
        />
        <span className="text-sm text-muted-foreground">minutes</span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

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

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Attendance"
        title="Break Alarm & Auto-Call Control"
        description="Set allowance and escalation thresholds, rehearse the red overrun overlay, and control the automatic supervisor call ring."
        actions={
          <>
            <Button variant="outline" onClick={resetConfig}>
              <RotateCcw className="size-4" /> Restore defaults
            </Button>
            <Button onClick={() => toast.success("Alarm policy saved for the Sales floor")}>
              <Save className="size-4" /> Save policy
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Alarm engine"
          value={<StatusBadge status={alarmState} />}
          hint={config.soundEnabled ? "Audible siren on" : "Silent mode"}
          tone={config.alarmEnabled ? "brand" : "warning"}
          icon={<AlarmClock className="size-4" />}
        />
        <StatCard
          label="Current presence"
          value={status}
          hint={`${formatDuration(statusSeconds)} in status`}
          tone="info"
        />
        <StatCard
          label="Allowance"
          value={allowanceSeconds === null ? "—" : formatDuration(allowanceSeconds)}
          hint={allowanceSeconds === null ? "Not on break" : "Remaining before alarm"}
        />
        <StatCard
          label="Overrun"
          value={`+${formatDuration(overrunSeconds)}`}
          hint={
            autoCallRinging
              ? "Auto-call ringing"
              : escalated
                ? "HR escalation reached"
                : "Within tolerance"
          }
          tone={overrunSeconds > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <Card className="gap-4 p-5 shadow-card">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Thresholds</h2>
              <p className="text-xs text-muted-foreground">
                Applied to every agent on the standard 07:00–16:00 Pacific shift.
              </p>
            </div>
            <Separator />
            <div className="grid gap-5 sm:grid-cols-2">
              <MinutesField
                id="break-allowance"
                label="Break allowance"
                hint="Breaks at 09:00 and 13:30. Default 15 minutes."
                seconds={config.breakAllowanceSeconds}
                onChange={(s) => updateConfig({ breakAllowanceSeconds: s })}
              />
              <MinutesField
                id="lunch-allowance"
                label="Lunch allowance"
                hint="Lunch at 11:00. Default 30 minutes."
                seconds={config.lunchAllowanceSeconds}
                onChange={(s) => updateConfig({ lunchAllowanceSeconds: s })}
              />
              <MinutesField
                id="auto-call"
                label="Auto-call after overrun"
                hint="Supervisor auto-dial once the overrun passes this point. Default 2 minutes."
                seconds={config.autoCallAfterSeconds}
                step={0.5}
                onChange={(s) => updateConfig({ autoCallAfterSeconds: s })}
              />
              <MinutesField
                id="escalate"
                label="HR escalation after overrun"
                hint="Team lead and HR notified, attendance exception filed. Default 5 minutes."
                seconds={config.escalateAfterSeconds}
                step={0.5}
                onChange={(s) => updateConfig({ escalateAfterSeconds: s })}
              />
            </div>
          </Card>

          <Card className="gap-0 p-5 shadow-card">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-foreground">Behaviour</h2>
              <p className="text-xs text-muted-foreground">
                Controls what the agent sees and hears when an allowance is exceeded.
              </p>
            </div>
            <Separator className="mb-1" />
            {[
              {
                key: "alarmEnabled" as const,
                title: "Red screen alarm",
                copy: "Full-screen red overlay locks the agent's workspace on overrun.",
              },
              {
                key: "soundEnabled" as const,
                title: "Audible siren",
                copy: "Repeating tone plays while the overlay is active.",
              },
              {
                key: "autoCallEnabled" as const,
                title: "Automatic supervisor call ring",
                copy: `Auto-dials the agent from ${config.supervisor} through CallTools.`,
              },
              {
                key: "allowAcknowledge" as const,
                title: "Allow acknowledge & dismiss",
                copy: "When off, the overlay can only be cleared by returning to Available.",
              },
            ].map((row) => (
              <div
                key={row.key}
                className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{row.title}</p>
                  <p className="text-xs text-muted-foreground">{row.copy}</p>
                </div>
                <Switch
                  checked={config[row.key]}
                  onCheckedChange={(v) => updateConfig({ [row.key]: v })}
                  aria-label={row.title}
                />
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="gap-4 p-5 shadow-card">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Test the alarm</h2>
              <p className="text-xs text-muted-foreground">
                Runs a rehearsal overrun on your own session only — no attendance exception is
                recorded.
              </p>
            </div>
            <Separator />
            {testing ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  Test running · overrun{" "}
                  <span className="tabular font-semibold">+{formatDuration(overrunSeconds)}</span>
                </p>
                <Button variant="destructive" className="w-full" onClick={stopAlarmTest}>
                  <Square className="size-4" /> End test & return to Available
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Button onClick={() => startAlarmTest("Break")}>
                  <Play className="size-4" /> Test break overrun
                </Button>
                <Button variant="outline" onClick={() => startAlarmTest("Lunch")}>
                  <Play className="size-4" /> Test lunch overrun
                </Button>
                <Button
                  variant="outline"
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
            <div className="flex items-start justify-between gap-4 rounded-md bg-surface/70 p-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Volume2 className="size-4" /> Accelerated demo timers
                </p>
                <p className="text-xs text-muted-foreground">
                  Compresses allowances to seconds so escalation can be reviewed quickly.
                </p>
              </div>
              <Switch checked={demoMode} onCheckedChange={setDemoMode} aria-label="Demo timers" />
            </div>
          </Card>

          <Card className="gap-4 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">Escalation ladder</h2>
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

          <Card className="gap-4 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">Session log</h2>
            <Timeline items={events.slice(-6).reverse()} />
          </Card>
        </div>
      </div>
    </div>
  );
}
