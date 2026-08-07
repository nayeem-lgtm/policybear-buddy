import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Clock3, Coffee, RefreshCw, UtensilsCrossed } from "lucide-react";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getAttendanceRegister } from "@/lib/shift.functions";
import { formatClock, formatHm, pacificDate, workedSeconds } from "@/lib/shift-shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance Register — Policy Bear CRM" },
      {
        name: "description",
        content:
          "HR attendance register with automatic sign-in and sign-out times, worked hours, break and lunch totals per employee.",
      },
      { property: "og:title", content: "Attendance Register — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Live attendance tracking: available time, break time, lunch time and overruns.",
      },
    ],
  }),
  component: AttendancePage,
});

const RANGES = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 6 },
  { label: "Last 30 days", days: 29 },
];

function shiftDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return pacificDate(d);
}

function AttendancePage() {
  const [rangeIndex, setRangeIndex] = useState(1);
  const range = RANGES[rangeIndex]!;
  const load = useServerFn(getAttendanceRegister);

  const query = useQuery({
    queryKey: ["attendance-register", range.days],
    queryFn: () => load({ data: { from: shiftDate(range.days), to: pacificDate() } }),
    refetchInterval: 60_000,
  });

  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("all");

  const rows = useMemo(() => {
    const profiles = new Map((query.data?.profiles ?? []).map((p) => [p.id, p]));
    return (query.data?.sessions ?? []).map((s) => {
      const p = profiles.get(s.user_id);
      return {
        ...s,
        name: p?.name ?? "Unknown employee",
        team: p?.team ?? "—",
        title: p?.title ?? "",
        initials: p?.avatar_initials ?? "??",
        worked: workedSeconds(s),
      };
    });
  }, [query.data]);

  const teams = useMemo(() => Array.from(new Set(rows.map((r) => r.team))).sort(), [rows]);

  const filtered = rows.filter((r) => {
    const matchesSearch =
      !search ||
      `${r.name} ${r.team} ${r.work_date}`.toLowerCase().includes(search.toLowerCase());
    const matchesTeam = team === "all" || r.team === team;
    return matchesSearch && matchesTeam;
  });

  const totals = filtered.reduce(
    (acc, r) => ({
      worked: acc.worked + r.worked,
      breaks: acc.breaks + r.break_seconds,
      lunch: acc.lunch + r.lunch_seconds,
      overrun: acc.overrun + r.break_overrun_seconds + r.lunch_overrun_seconds,
    }),
    { worked: 0, breaks: 0, lunch: 0, overrun: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Attendance Register"
        description="Automatic sign-in and sign-out times with break, lunch and available-time totals for every employee."
        actions={
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Shift records"
          value={filtered.length}
          hint={`${range.label} · ${query.data?.from ?? "—"} → ${query.data?.to ?? "—"}`}
          icon={<CalendarDays className="size-4" />}
          tone="brand"
        />
        <StatCard
          label="Worked time"
          value={formatHm(totals.worked)}
          hint="Excludes break & lunch"
          icon={<Clock3 className="size-4" />}
        />
        <StatCard
          label="Break / lunch"
          value={`${formatHm(totals.breaks)} / ${formatHm(totals.lunch)}`}
          hint="Combined for the selection"
          icon={<Coffee className="size-4" />}
          tone="warning"
        />
        <StatCard
          label="Overrun time"
          value={formatHm(totals.overrun)}
          hint="Past break/lunch allowance"
          icon={<UtensilsCrossed className="size-4" />}
          tone={totals.overrun > 0 ? "danger" : "success"}
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search employee, team or date…"
        filters={[
          { key: "range", label: "Range", options: RANGES.map((r) => r.label) },
          { key: "team", label: "Team", options: teams },
        ]}
        values={{ range: range.label, team }}
        onChange={(key, value) => {
          if (key === "team") setTeam(value);
          if (key === "range") {
            const idx = RANGES.findIndex((r) => r.label === value);
            setRangeIndex(idx === -1 ? 1 : idx);
          }
        }}
        onReset={() => {
          setSearch("");
          setTeam("all");
          setRangeIndex(1);
        }}
      />

      <DataTable
        columns={[
          {
            key: "employee",
            header: "Employee",
            cell: (r) => (
              <div className="flex items-center gap-2.5">
                <Avatar className="size-7">
                  <AvatarFallback className="text-[0.65rem]">{r.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.team}</p>
                </div>
              </div>
            ),
          },
          { key: "date", header: "Date", cell: (r) => r.work_date },
          { key: "in", header: "Sign in", cell: (r) => formatClock(r.signed_in_at) },
          {
            key: "out",
            header: "Sign out",
            cell: (r) =>
              r.signed_out_at ? (
                <span>
                  {formatClock(r.signed_out_at)}
                  {r.auto_closed && (
                    <span className="ml-1 text-xs text-muted-foreground">(auto)</span>
                  )}
                </span>
              ) : (
                <StatusBadge status="Active" tone="success" />
              ),
          },
          {
            key: "worked",
            header: "Worked",
            align: "right",
            cell: (r) => <span className="tabular font-medium">{formatHm(r.worked)}</span>,
          },
          {
            key: "available",
            header: "Available",
            align: "right",
            cell: (r) => <span className="tabular">{formatHm(r.available_seconds)}</span>,
          },
          {
            key: "call",
            header: "On call",
            align: "right",
            cell: (r) => <span className="tabular">{formatHm(r.on_call_seconds)}</span>,
          },
          {
            key: "break",
            header: "Break",
            align: "right",
            cell: (r) => (
              <span className={cn("tabular", r.break_overrun_seconds > 0 && "text-destructive")}>
                {formatHm(r.break_seconds)}
                {r.break_count > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">×{r.break_count}</span>
                )}
              </span>
            ),
          },
          {
            key: "lunch",
            header: "Lunch",
            align: "right",
            cell: (r) => (
              <span className={cn("tabular", r.lunch_overrun_seconds > 0 && "text-destructive")}>
                {formatHm(r.lunch_seconds)}
              </span>
            ),
          },
          {
            key: "overrun",
            header: "Overrun",
            align: "right",
            cell: (r) => {
              const over = r.break_overrun_seconds + r.lunch_overrun_seconds;
              return over > 0 ? (
                <span className="tabular font-semibold text-destructive">{formatHm(over)}</span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              );
            },
          },
          {
            key: "status",
            header: "Current",
            cell: (r) => <StatusBadge status={r.current_status} />,
          },
        ]}
        rows={filtered}
        empty={
          query.isLoading
            ? "Loading attendance records…"
            : "No shift records for this range yet — records appear as soon as employees sign in."
        }
      />
    </div>
  );
}
