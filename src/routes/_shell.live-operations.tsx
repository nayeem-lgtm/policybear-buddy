import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Radio, Users, Timer } from "lucide-react";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { employees, type PresenceStatus } from "@/lib/mock-data";
import { unique } from "@/lib/use-filters";
import { useFilters } from "@/lib/use-filters";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/live-operations")({
  head: () => ({
    meta: [
      { title: "Live Operations — Policy Bear CRM" },
      {
        name: "description",
        content: "Real-time floor view of every agent's presence status, duration and over-break warnings.",
      },
      { property: "og:title", content: "Live Operations — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Presence tiles and status table for the live floor supervisor view.",
      },
    ],
  }),
  component: LiveOperationsPage,
});

const OVER_BREAK_MINUTES = 16;

function durationMinutes(duration: string) {
  const match = duration.match(/(\d+)m/);
  return match ? Number(match[1]) : 0;
}

function toneForStatus(status: PresenceStatus) {
  switch (status) {
    case "Available":
      return "success" as const;
    case "On Call":
      return "brand" as const;
    case "Break":
    case "Lunch":
      return "warning" as const;
    case "Not Available":
      return "danger" as const;
    case "Signed Out":
      return "muted" as const;
    default:
      return "info" as const;
  }
}

function LiveOperationsPage() {
  const teams = useMemo(() => unique(employees, (e) => e.team), []);
  const statuses = useMemo(() => unique(employees, (e) => e.status), []);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(employees, {
    searchFields: (e) => [e.name, e.email, e.team],
    filters: {
      team: (e) => e.team,
      status: (e) => e.status,
    },
  });

  const [minDuration, setMinDuration] = useState(false);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of employees) map[e.status] = (map[e.status] ?? 0) + 1;
    return map;
  }, []);

  const overBreak = employees.filter(
    (e) =>
      (e.status === "Break" || e.status === "Lunch") &&
      durationMinutes(e.statusDuration) > OVER_BREAK_MINUTES,
  );

  const onFloor = employees.filter((e) => e.status !== "Signed Out").length;

  const rows = minDuration
    ? filtered.filter((e) => durationMinutes(e.statusDuration) > OVER_BREAK_MINUTES)
    : filtered;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Live Operations"
        description="Real-time presence across the floor — spot over-break agents and monitor team coverage."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="On the floor"
          value={onFloor}
          hint={`of ${employees.length} employees`}
          icon={<Users className="size-4" />}
          tone="brand"
        />
        <StatCard
          label="On call"
          value={counts["On Call"] ?? 0}
          hint="Currently talking"
          icon={<Radio className="size-4" />}
          tone="info"
        />
        <StatCard
          label="On break / lunch"
          value={(counts["Break"] ?? 0) + (counts["Lunch"] ?? 0)}
          hint="Combined"
          tone="warning"
        />
        <StatCard
          label="Over-break warnings"
          value={overBreak.length}
          hint="Past allowance"
          icon={<AlertTriangle className="size-4" />}
          tone={overBreak.length > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-9">
        {statuses.map((s) => (
          <Card
            key={s}
            className={cn(
              "gap-1 p-3 shadow-card",
              values["status"] === s && "ring-2 ring-brand",
            )}
          >
            <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
              {s}
            </p>
            <p className="text-xl font-semibold text-foreground tabular">{counts[s] ?? 0}</p>
          </Card>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search employees…"
        filters={[
          { key: "team", label: "Team", options: teams },
          { key: "status", label: "Status", options: statuses },
        ]}
        values={values}
        onChange={setValue}
        onReset={() => {
          reset();
          setMinDuration(false);
        }}
        trailing={
          <button
            type="button"
            onClick={() => setMinDuration((v) => !v)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium",
              minDuration ? "bg-destructive/10 text-destructive" : "text-muted-foreground",
            )}
          >
            <Timer className="size-3.5" /> Over-break only
          </button>
        }
      />

      <DataTable
        columns={[
          {
            key: "name",
            header: "Employee",
            cell: (e) => (
              <div className="flex items-center gap-2.5">
                <Avatar className="size-7">
                  <AvatarFallback className="text-[0.65rem]">{e.avatarInitials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.title}</p>
                </div>
              </div>
            ),
          },
          { key: "team", header: "Team", cell: (e) => e.team },
          {
            key: "status",
            header: "Status",
            cell: (e) => <StatusBadge status={e.status} tone={toneForStatus(e.status)} />,
          },
          {
            key: "duration",
            header: "Duration",
            align: "right",
            cell: (e) => (
              <span
                className={cn(
                  "tabular",
                  (e.status === "Break" || e.status === "Lunch") &&
                    durationMinutes(e.statusDuration) > OVER_BREAK_MINUTES &&
                    "font-semibold text-destructive",
                )}
              >
                {e.statusDuration}
              </span>
            ),
          },
          { key: "calls", header: "Calls today", align: "right", cell: (e) => e.callsToday },
          {
            key: "alert",
            header: "Alert",
            cell: (e) =>
              e.alert ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertTriangle className="size-3.5" /> {e.alert}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
          },
        ]}
        rows={rows}
        empty="No employees match the current filters."
      />
    </div>
  );
}
