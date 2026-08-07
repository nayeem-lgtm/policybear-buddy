import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertOctagon, Coffee, Clock3, LogOut, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { Button } from "@/components/ui/button";
import { getAttendanceRegister } from "@/lib/shift.functions";
import { formatClock, formatHm, pacificDate } from "@/lib/shift-shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/attendance-exceptions")({
  head: () => ({
    meta: [
      { title: "Attendance Exceptions — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Late sign-ins, early sign-outs, missed sign-outs and break/lunch overruns detected automatically from shift records.",
      },
      { property: "og:title", content: "Attendance Exceptions — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Automatically detected attendance exceptions with evidence from the shift log.",
      },
    ],
  }),
  component: AttendanceExceptionsPage,
});

type ExceptionType = "Late" | "Early Out" | "Missed Sign Out" | "Break Overrun" | "Lunch Overrun";

/** Standard Pacific shift: 07:00 sign-in (15 min grace) to 16:00 sign-out. */
const SHIFT_START_MINUTES = 7 * 60;
const LATE_GRACE_MINUTES = 15;
const SHIFT_END_MINUTES = 16 * 60;

function pacificMinutes(iso: string) {
  const label = new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = label.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function AttendanceExceptionsPage() {
  const load = useServerFn(getAttendanceRegister);
  const from = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return pacificDate(d);
  }, []);

  const query = useQuery({
    queryKey: ["attendance-exceptions", from],
    queryFn: () => load({ data: { from, to: pacificDate() } }),
    refetchInterval: 60_000,
  });

  const exceptions = useMemo(() => {
    const profiles = new Map((query.data?.profiles ?? []).map((p) => [p.id, p]));
    const out: {
      id: string;
      employee: string;
      team: string;
      type: ExceptionType;
      date: string;
      detail: string;
      minutes: number;
    }[] = [];

    for (const s of query.data?.sessions ?? []) {
      const p = profiles.get(s.user_id);
      const base = { employee: p?.name ?? "Unknown employee", team: p?.team ?? "—", date: s.work_date };

      const inMinutes = pacificMinutes(s.signed_in_at);
      if (inMinutes > SHIFT_START_MINUTES + LATE_GRACE_MINUTES) {
        out.push({
          ...base,
          id: `${s.id}-late`,
          type: "Late",
          detail: `Signed in ${formatClock(s.signed_in_at)} — ${inMinutes - SHIFT_START_MINUTES} min after 07:00`,
          minutes: inMinutes - SHIFT_START_MINUTES,
        });
      }

      if (s.signed_out_at && !s.auto_closed) {
        const outMinutes = pacificMinutes(s.signed_out_at);
        if (outMinutes < SHIFT_END_MINUTES - 15) {
          out.push({
            ...base,
            id: `${s.id}-early`,
            type: "Early Out",
            detail: `Signed out ${formatClock(s.signed_out_at)} — ${SHIFT_END_MINUTES - outMinutes} min early`,
            minutes: SHIFT_END_MINUTES - outMinutes,
          });
        }
      }

      if (s.auto_closed) {
        out.push({
          ...base,
          id: `${s.id}-missed`,
          type: "Missed Sign Out",
          detail: `No sign-out recorded — closed automatically at ${formatClock(s.signed_out_at)}`,
          minutes: 0,
        });
      }

      if (s.break_overrun_seconds > 0) {
        out.push({
          ...base,
          id: `${s.id}-break`,
          type: "Break Overrun",
          detail: `${formatHm(s.break_overrun_seconds)} over break allowance (${formatHm(s.break_seconds)} total, ${s.break_count} breaks)`,
          minutes: Math.round(s.break_overrun_seconds / 60),
        });
      }

      if (s.lunch_overrun_seconds > 0) {
        out.push({
          ...base,
          id: `${s.id}-lunch`,
          type: "Lunch Overrun",
          detail: `${formatHm(s.lunch_overrun_seconds)} over lunch allowance (${formatHm(s.lunch_seconds)} total)`,
          minutes: Math.round(s.lunch_overrun_seconds / 60),
        });
      }
    }

    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [query.data]);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [team, setTeam] = useState("all");

  const teams = useMemo(() => Array.from(new Set(exceptions.map((e) => e.team))).sort(), [exceptions]);
  const types = ["Late", "Early Out", "Missed Sign Out", "Break Overrun", "Lunch Overrun"];

  const filtered = exceptions.filter(
    (e) =>
      (!search || `${e.employee} ${e.detail} ${e.date}`.toLowerCase().includes(search.toLowerCase())) &&
      (type === "all" || e.type === type) &&
      (team === "all" || e.team === team),
  );

  const count = (t: ExceptionType) => exceptions.filter((e) => e.type === t).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Attendance Exceptions"
        description="Detected automatically from shift records — late sign-ins, early or missed sign-outs and break/lunch overruns."
        actions={
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total exceptions"
          value={exceptions.length}
          hint="Last 30 days"
          icon={<AlertOctagon className="size-4" />}
          tone={exceptions.length > 0 ? "warning" : "success"}
        />
        <StatCard label="Late sign-ins" value={count("Late")} icon={<Clock3 className="size-4" />} />
        <StatCard
          label="Break / lunch overruns"
          value={count("Break Overrun") + count("Lunch Overrun")}
          icon={<Coffee className="size-4" />}
          tone="danger"
        />
        <StatCard
          label="Missed sign-outs"
          value={count("Missed Sign Out")}
          icon={<LogOut className="size-4" />}
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search employee or detail…"
        filters={[
          { key: "type", label: "Type", options: types },
          { key: "team", label: "Team", options: teams },
        ]}
        values={{ type, team }}
        onChange={(key, value) => {
          if (key === "type") setType(value);
          if (key === "team") setTeam(value);
        }}
        onReset={() => {
          setSearch("");
          setType("all");
          setTeam("all");
        }}
      />

      <DataTable
        columns={[
          { key: "employee", header: "Employee", cell: (e) => e.employee },
          { key: "team", header: "Team", cell: (e) => e.team },
          { key: "date", header: "Date", cell: (e) => e.date },
          {
            key: "type",
            header: "Type",
            cell: (e) => (
              <StatusBadge
                status={e.type}
                tone={
                  e.type === "Break Overrun" || e.type === "Lunch Overrun"
                    ? "danger"
                    : e.type === "Missed Sign Out"
                      ? "muted"
                      : "warning"
                }
              />
            ),
          },
          { key: "detail", header: "Detail", cell: (e) => e.detail },
          {
            key: "minutes",
            header: "Minutes",
            align: "right",
            cell: (e) => <span className="tabular">{e.minutes || "—"}</span>,
          },
        ]}
        rows={filtered}
        empty={
          query.isLoading
            ? "Checking shift records…"
            : "No attendance exceptions — everyone is on schedule."
        }
      />
    </div>
  );
}
