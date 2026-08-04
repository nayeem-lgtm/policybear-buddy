import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertTriangle, PhoneCall, Users } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employees, callbacks } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/operations")({
  head: () => ({
    meta: [
      { title: "Daily Operations — Policy Bear CRM" },
      {
        name: "description",
        content: "Floor control cockpit with shift coverage, live queue depth, SLA breaches and team scoreboard.",
      },
      { property: "og:title", content: "Daily Operations — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Floor control cockpit with shift coverage, live queue depth, SLA breaches and team scoreboard.",
      },
    ],
  }),
  component: DailyOperationsPage,
});

const days = ["Mon Aug 3", "Tue Aug 4", "Wed Aug 5", "Thu Aug 6", "Fri Aug 7"];

const teams = Array.from(new Set(employees.map((e) => e.team)));

function DailyOperationsPage() {
  const [day, setDay] = useState(days[0]!);

  const onShift = employees.filter((e) => e.status !== "Signed Out");
  const onCall = employees.filter((e) => e.status === "On Call");
  const overdueCallbacks = callbacks.filter((c) => c.status === "Overdue" || c.status === "Missed");
  const queueDepth = callbacks.filter((c) => c.status === "Due" || c.status === "Scheduled").length;

  const scoreboard = useMemo(
    () =>
      teams.map((team) => {
        const members = employees.filter((e) => e.team === team);
        const calls = members.reduce((s, m) => s + m.callsToday, 0);
        const sales = members.reduce((s, m) => s + m.sales, 0);
        const active = members.filter((m) => m.status !== "Signed Out").length;
        return { team, members: members.length, active, calls, sales };
      }),
    [],
  );

  const alerts = employees.filter((e) => e.alert);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control"
        title="Daily Operations"
        description="Floor control cockpit — coverage, queue depth, SLA breaches, and per-team performance."
        actions={
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {days.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="On shift"
          value={`${onShift.length}/${employees.length}`}
          hint="Signed in right now"
          tone="brand"
          icon={<Users className="size-4" />}
        />
        <StatCard
          label="Live on call"
          value={onCall.length}
          hint="Talking to a customer"
          tone="info"
          icon={<PhoneCall className="size-4" />}
        />
        <StatCard
          label="Queue depth"
          value={queueDepth}
          hint="Callbacks due or scheduled"
          tone="warning"
          icon={<Activity className="size-4" />}
        />
        <StatCard
          label="SLA breaches"
          value={overdueCallbacks.length}
          hint="Overdue or missed callbacks"
          tone="danger"
          icon={<AlertTriangle className="size-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-4 shadow-card xl:col-span-2">
          <p className="mb-3 text-sm font-semibold text-foreground">Per-team scoreboard — {day}</p>
          <div className="space-y-3">
            {scoreboard.map((row) => {
              const pct = Math.round((row.active / row.members) * 100);
              return (
                <div key={row.team} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{row.team}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.active}/{row.members} active · {row.calls} calls · {row.sales} sales
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4 shadow-card">
          <p className="mb-3 text-sm font-semibold text-foreground">Active alerts</p>
          <div className="space-y-2">
            {alerts.length === 0 && (
              <p className="text-sm text-muted-foreground">No alerts right now.</p>
            )}
            {alerts.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{e.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.team}</p>
                </div>
                <StatusBadge status={e.alert ?? ""} tone="danger" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Shift coverage</p>
          <Button variant="outline" size="sm">
            Export coverage snapshot
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {teams.map((team) => {
            const members = employees.filter((e) => e.team === team);
            const active = members.filter((m) => m.status !== "Signed Out").length;
            return (
              <div key={team} className="rounded-md border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase">{team}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {active}
                  <span className="text-sm font-normal text-muted-foreground">/{members.length}</span>
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
