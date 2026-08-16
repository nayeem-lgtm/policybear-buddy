import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BellRing, CheckCircle2, PauseCircle, Workflow, Zap } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { hrAutomations, type HrAutomation } from "@/lib/hr-data";

export const Route = createFileRoute("/_shell/hr-automations")({
  head: () => ({
    meta: [
      { title: "HR Automations — Policy Bear CRM" },
      {
        name: "description",
        content: "HR and payroll automation control: attendance, payroll, onboarding, compliance and training rules.",
      },
      { property: "og:title", content: "HR Automations — Policy Bear CRM" },
      {
        property: "og:description",
        content: "HR and payroll automation control: attendance, payroll, onboarding, compliance and training rules.",
      },
    ],
  }),
  component: HrAutomationsPage,
});

const CATEGORY_ORDER: HrAutomation["category"][] = [
  "Attendance",
  "Payroll",
  "Onboarding",
  "Compliance",
  "Training",
];

function HrAutomationsPage() {
  const [rows, setRows] = useState<HrAutomation[]>(hrAutomations);

  const enabledCount = rows.filter((r) => r.enabled).length;
  const runsThisMonth = rows.reduce((s, r) => s + r.runsThisMonth, 0);
  const attendanceCount = rows.filter((r) => r.category === "Attendance").length;
  const disabledCount = rows.length - enabledCount;

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: rows.filter((r) => r.category === category),
    })).filter((g) => g.items.length > 0);
  }, [rows]);

  function toggle(id: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, enabled: !r.enabled };
        toast.success(`${r.name} ${next.enabled ? "enabled" : "disabled"}.`);
        return next;
      }),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="HR Automations"
        description="Control every HR and payroll automation — attendance escalation, payroll sync, onboarding, compliance and training reminders."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Enabled Automations" value={enabledCount} tone="success" icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Runs This Month" value={runsThisMonth} icon={<Zap className="size-4" />} />
        <StatCard label="Attendance Automations" value={attendanceCount} icon={<BellRing className="size-4" />} />
        <StatCard label="Disabled" value={disabledCount} tone={disabledCount > 0 ? "warning" : "default"} icon={<PauseCircle className="size-4" />} />
      </div>

      <Card className="space-y-2 p-4 shadow-card">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Workflow className="size-4 text-brand" /> How escalation works
        </p>
        <p className="text-sm text-muted-foreground">
          Break overrun → red screen + siren → auto call to the agent → HR exception logged → payroll deduction
          applied on the next Gusto run.
        </p>
        <div className="flex flex-wrap gap-3 pt-1 text-sm">
          <Link to="/break-alarm" className="inline-flex items-center gap-1 text-brand hover:underline">
            Break Alarm Control <ArrowRight className="size-3.5" />
          </Link>
          <Link to="/attendance" className="inline-flex items-center gap-1 text-brand hover:underline">
            Attendance Exceptions <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </Card>

      <div className="space-y-5">
        {grouped.map((group) => (
          <div key={group.category} className="space-y-2.5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.category}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {group.items.map((automation) => (
                <Card key={automation.id} className="space-y-2.5 p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{automation.name}</p>
                      <p className="text-xs text-muted-foreground">Owner: {automation.owner}</p>
                    </div>
                    <Switch checked={automation.enabled} onCheckedChange={() => toggle(automation.id)} />
                  </div>
                  <dl className="grid grid-cols-1 gap-1 text-xs">
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 font-medium text-muted-foreground">Trigger:</dt>
                      <dd className="text-foreground">{automation.trigger}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="shrink-0 font-medium text-muted-foreground">Action:</dt>
                      <dd className="text-foreground">{automation.action}</dd>
                    </div>
                  </dl>
                  <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                    <span>Last run {automation.lastRun}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{automation.runsThisMonth} runs/mo</Badge>
                      <Badge variant={automation.enabled ? "secondary" : "outline"}>
                        {automation.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
