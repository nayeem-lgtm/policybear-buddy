import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Radio, RefreshCw, Users, Timer } from "lucide-react";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAttendanceRegister } from "@/lib/shift.functions";
import { formatClock, formatHm, pacificDate } from "@/lib/shift-shared";
import type { PresenceStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/live-operations")({
  head: () => ({
    meta: [
      { title: "Live Operations — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Real-time floor view of every employee's presence status, time in status and break overruns.",
      },
      { property: "og:title", content: "Live Operations — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Presence tiles and live status table for the floor supervisor view.",
      },
    ],
  }),
  component: LiveOperationsPage,
});

const STATUSES: PresenceStatus[] = [
  "Available",
  "On Call",
  "Break",
  "Lunch",
  "Meeting",
  "Training",
  "Not Available",
  "Signed Out",
];

function toneForStatus(status: string) {
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
  const load = useServerFn(getAttendanceRegister);
  const today = pacificDate();

  const query = useQuery({
    queryKey: ["live-operations", today],
    queryFn: () => load({ data: { from: today, to: today } }),
    refetchInterval: 20_000,
  });

  const rows = useMemo(() => {
    const profiles = new Map((query.data?.profiles ?? []).map((p) => [p.id, p]));
    const now = Date.now();
    return (query.data?.sessions ?? []).map((s) => {
      const p = profiles.get(s.user_id);
      const inStatus = Math.max(0, Math.round((now - new Date(s.current_status_at).getTime()) / 1000));
      const overrun = s.break_overrun_seconds + s.lunch_overrun_seconds;
      return {
        id: s.id,
        name: p?.name ?? "Unknown employee",
        title: p?.title ?? "",
        team: p?.team ?? "—",
        initials: p?.avatar_initials ?? "??",
        status: s.signed_out_at ? "Signed Out" : s.current_status,
        inStatus,
        signedInAt: s.signed_in_at,
        breakSeconds: s.break_seconds,
        lunchSeconds: s.lunch_seconds,
        overrun,
      };
    });
  }, [query.data]);

  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("all");
  const [status, setStatus] = useState("all");
  const [overrunOnly, setOverrunOnly] = useState(false);

  const teams = useMemo(() => Array.from(new Set(rows.map((r) => r.team))).sort(), [rows]);

  const filtered = rows.filter(
    (r) =>
      (!search || `${r.name} ${r.team}`.toLowerCase().includes(search.toLowerCase())) &&
      (team === "all" || r.team === team) &&
      (status === "all" || r.status === status) &&
      (!overrunOnly || r.overrun > 0),
  );

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const onFloor = rows.filter((r) => r.status !== "Signed Out").length;
  const overrunCount = rows.filter((r) => r.overrun > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Live Operations"
        description="Real-time presence for everyone signed in today — spot break overruns and monitor coverage."
        actions={
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="On the floor"
          value={onFloor}
          hint={`of ${rows.length} signed in today`}
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
          label="Overrun warnings"
          value={overrunCount}
          hint="Past allowance today"
          icon={<AlertTriangle className="size-4" />}
          tone={overrunCount > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {STATUSES.map((s) => (
          <Card
            key={s}
            onClick={() => setStatus(status === s ? "all" : s)}
            className={cn(
              "cursor-pointer gap-1 p-3 shadow-card",
              status === s && "ring-2 ring-brand",
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
          { key: "status", label: "Status", options: STATUSES },
        ]}
        values={{ team, status }}
        onChange={(key, value) => {
          if (key === "team") setTeam(value);
          if (key === "status") setStatus(value);
        }}
        onReset={() => {
          setSearch("");
          setTeam("all");
          setStatus("all");
          setOverrunOnly(false);
        }}
        trailing={
          <button
            type="button"
            onClick={() => setOverrunOnly((v) => !v)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium",
              overrunOnly ? "bg-destructive/10 text-destructive" : "text-muted-foreground",
            )}
          >
            <Timer className="size-3.5" /> Overrun only
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
                  <AvatarFallback className="text-[0.65rem]">{e.initials}</AvatarFallback>
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
            header: "In status",
            align: "right",
            cell: (e) => <span className="tabular">{formatHm(e.inStatus)}</span>,
          },
          { key: "in", header: "Signed in", cell: (e) => formatClock(e.signedInAt) },
          {
            key: "break",
            header: "Break / lunch",
            align: "right",
            cell: (e) => (
              <span className="tabular">
                {formatHm(e.breakSeconds)} / {formatHm(e.lunchSeconds)}
              </span>
            ),
          },
          {
            key: "alert",
            header: "Alert",
            cell: (e) =>
              e.overrun > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertTriangle className="size-3.5" /> {formatHm(e.overrun)} overrun
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
          },
        ]}
        rows={filtered}
        empty={
          query.isLoading
            ? "Loading the floor…"
            : "Nobody has signed in today yet — records appear automatically on login."
        }
      />
    </div>
  );
}
