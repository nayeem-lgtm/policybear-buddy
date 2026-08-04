import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, ClipboardCheck, Percent, UserCheck } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_shell/admin/rules")({
  head: () => ({
    meta: [
      { title: "Business Rules — Policy Bear CRM" },
      {
        name: "description",
        content: "Configurable thresholds and switches for attendance, QA, commission and callback SLA rules.",
      },
      { property: "og:title", content: "Business Rules — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Configurable thresholds and switches for attendance, QA, commission and callback SLA rules.",
      },
    ],
  }),
  component: BusinessRulesPage,
});

interface RuleField {
  key: string;
  label: string;
  value: number;
  suffix: string;
}

interface RuleGroup {
  key: string;
  title: string;
  icon: typeof ClipboardCheck;
  enabled: boolean;
  fields: RuleField[];
}

const initialGroups: RuleGroup[] = [
  {
    key: "attendance",
    title: "Attendance",
    icon: CalendarClock,
    enabled: true,
    fields: [
      { key: "break", label: "Break allowance", value: 15, suffix: "min" },
      { key: "lunch", label: "Lunch allowance", value: 30, suffix: "min" },
      { key: "lateGrace", label: "Late sign-in grace", value: 5, suffix: "min" },
      { key: "autoFlag", label: "Auto-flag after", value: 3, suffix: "occurrences" },
    ],
  },
  {
    key: "qa",
    title: "QA",
    icon: ClipboardCheck,
    enabled: true,
    fields: [
      { key: "passScore", label: "Passing score", value: 85, suffix: "%" },
      { key: "sampleRate", label: "Review sample rate", value: 10, suffix: "% of calls" },
      { key: "disputeWindow", label: "Dispute window", value: 5, suffix: "days" },
    ],
  },
  {
    key: "commission",
    title: "Commission",
    icon: Percent,
    enabled: true,
    fields: [
      { key: "chargebackWindow", label: "Chargeback recoup window", value: 90, suffix: "days" },
      { key: "holdback", label: "New agent holdback", value: 20, suffix: "%" },
      { key: "minPremium", label: "Minimum qualifying premium", value: 45, suffix: "$" },
    ],
  },
  {
    key: "callback",
    title: "Callback SLA",
    icon: UserCheck,
    enabled: false,
    fields: [
      { key: "dueWithin", label: "Due within", value: 24, suffix: "hours" },
      { key: "escalate", label: "Escalate after", value: 48, suffix: "hours" },
      { key: "maxAttempts", label: "Max attempts", value: 3, suffix: "attempts" },
    ],
  },
];

function BusinessRulesPage() {
  const [groups, setGroups] = useState(initialGroups);

  function toggleGroup(key: string) {
    setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, enabled: !g.enabled } : g)));
  }

  function updateField(groupKey: string, fieldKey: string, value: number) {
    setGroups((prev) =>
      prev.map((g) =>
        g.key === groupKey
          ? { ...g, fields: g.fields.map((f) => (f.key === fieldKey ? { ...f, value } : f)) }
          : g,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Business Rules"
        description="Configure operational thresholds that drive automations across the CRM."
        actions={<Button size="sm">Save all changes</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.key} className="gap-3 p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <group.icon className="size-4 text-brand" />
                <p className="text-sm font-semibold text-foreground">{group.title}</p>
              </div>
              <Switch checked={group.enabled} onCheckedChange={() => toggleGroup(group.key)} />
            </div>
            <Separator />
            <div className="space-y-3">
              {group.fields.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-3">
                  <Label className="text-sm font-normal text-muted-foreground">{f.label}</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      disabled={!group.enabled}
                      value={f.value}
                      onChange={(e) => updateField(group.key, f.key, Number(e.target.value))}
                      className="h-8 w-20 text-right"
                    />
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">{f.suffix}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
