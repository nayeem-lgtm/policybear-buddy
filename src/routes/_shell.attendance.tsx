import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertOctagon,
  CalendarDays,
  Clock3,
  Coffee,
  RefreshCw,
  Search,
  TimerReset,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable } from "@/components/crm/DataTable";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAttendanceRegister } from "@/lib/shift.functions";
import { formatClock, formatHm, pacificDate, workedSeconds } from "@/lib/shift-shared";
import { DateRangeTabs, presetLabel, type DateSelection } from "@/components/crm/DateRangeTabs";
import { exceptionsForSession, exceptionTone } from "@/lib/attendance-exceptions";
import { cn } from "@/lib/utils";

const STANDARD_DAY_SECONDS = 8 * 3600;

/** Maps a date preset / custom range to Pacific-calendar from–to date strings. */
function rangeFromSelection(sel: DateSelection): { from: string; to: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const todayStr = `${y}-${pad(m)}-${pad(d)}`;
  const dateStr = (yy: number, mm: number, dd: number) => `${yy}-${pad(mm)}-${pad(dd)}`;

  switch (sel.preset) {
    case "today":
      return { from: todayStr, to: todayStr };
    case "yesterday": {
      const yd = new Date(y, m - 1, d - 1);
      const s = dateStr(yd.getFullYear(), yd.getMonth() + 1, yd.getDate());
      return { from: s, to: s };
    }
    case "7d": {
      const start = new Date(y, m - 1, d - 6);
      return {
        from: dateStr(start.getFullYear(), start.getMonth() + 1, start.getDate()),
        to: todayStr,
      };
    }
    case "month":
      return { from: dateStr(y, m, 1), to: todayStr };
    case "last-month": {
      const lm = m - 1;
      const ly = lm < 1 ? y - 1 : y;
      const lmm = lm < 1 ? 12 : lm;
      const lastDay = new Date(ly, lmm, 0).getDate();
      return { from: dateStr(ly, lmm, 1), to: dateStr(ly, lmm, lastDay) };
    }
    case "year":
      return { from: dateStr(y, 1, 1), to: todayStr };
    case "custom": {
      const fmt = (dt?: Date) =>
        dt ? `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` : todayStr;
      return { from: fmt(sel.range?.from), to: fmt(sel.range?.to ?? sel.range?.from) };
    }
  }
}

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AttendancePage,
});

/* ---------- building blocks ---------- */

function Ring({
  value,
  size = 116,
  stroke = 10,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
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
          className="text-brand-cyan transition-[stroke-dashoffset] duration-700"
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
  accent?: "default" | "brand" | "info" | "warning" | "danger" | "success";
}) {
  const accentClass = {
    default: "bg-muted text-muted-foreground",
    brand: "bg-brand/10 text-brand",
    info: "bg-brand-cyan/25 text-brand-teal",
    warning: "bg-warning/25 text-brand-tan",
    danger: "bg-destructive/12 text-destructive",
    success: "bg-success/15 text-success",
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

/* ---------- page ---------- */

function AttendancePage() {
  const [selection, setSelection] = useState<DateSelection>({ preset: "7d" });
  const { from, to } = rangeFromSelection(selection);
  const load = useServerFn(getAttendanceRegister);

  const query = useQuery({
    queryKey: ["attendance-register", from, to],
    queryFn: () => load({ data: { from, to } }),
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
    (acc, r) => {
      const overtime = Math.max(0, r.worked - STANDARD_DAY_SECONDS);
      return {
        worked: acc.worked + r.worked,
        breaks: acc.breaks + r.break_seconds,
        lunch: acc.lunch + r.lunch_seconds,
        overrun: acc.overrun + r.break_overrun_seconds + r.lunch_overrun_seconds,
        overtime: acc.overtime + overtime,
      };
    },
    { worked: 0, breaks: 0, lunch: 0, overrun: 0, overtime: 0 },
  );

  const people = new Set(filtered.map((r) => r.user_id)).size;
  const activeNow = filtered.filter((r) => !r.signed_out_at).length;
  const avgWorked = filtered.length ? totals.worked / filtered.length : 0;
  const compliancePct = filtered.length
    ? Math.round(
        (filtered.filter((r) => r.break_overrun_seconds + r.lunch_overrun_seconds === 0).length /
          filtered.length) *
          100,
      )
    : 100;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="brand-gradient relative gap-0 overflow-hidden rounded-3xl border-0 p-0 text-brand-foreground shadow-raised">
        <div className="brand-mesh absolute inset-0 opacity-90" aria-hidden />
        <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <Ring value={compliancePct}>
              <span className="tabular font-display text-xl leading-none font-semibold text-brand-foreground">
                {compliancePct}%
              </span>
              <span className="mt-1 text-[0.6rem] tracking-[0.14em] text-brand-foreground/60 uppercase">
                compliant
              </span>
            </Ring>
            <div className="space-y-2">
              <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-brand-foreground/60 uppercase">
                Attendance · register
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="tabular rounded-full bg-brand-foreground/12 px-2.5 py-1 text-xs font-medium text-brand-foreground/85">
                  {people} employees
                </span>
                <span className="tabular rounded-full bg-brand-foreground/12 px-2.5 py-1 text-xs font-medium text-brand-foreground/85">
                  {activeNow} on shift now
                </span>
                <span className="rounded-full bg-brand-foreground/12 px-2.5 py-1 text-xs font-medium text-brand-foreground/85">
                  {presetLabel(selection)}
                </span>
                <span className="tabular rounded-full bg-brand-foreground/12 px-2.5 py-1 text-xs font-medium text-brand-foreground/85">
                  {query.data?.from ?? "—"} → {query.data?.to ?? "—"}
                </span>
              </div>
              <p className="max-w-lg text-sm text-brand-foreground/70">
                Automatic sign-in and sign-out times with break, lunch and available-time totals for
                every employee.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh attendance"
              className="rounded-xl text-brand-foreground hover:bg-brand-foreground/12 hover:text-brand-foreground"
              onClick={() => void query.refetch()}
            >
              <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile
          label="Shift records"
          value={filtered.length}
          hint={`${presetLabel(selection)} · ${people} employees`}
          icon={<CalendarDays className="size-4" />}
          accent="brand"
        />
        <MetricTile
          label="Worked time"
          value={formatHm(totals.worked)}
          hint={`Avg ${formatHm(avgWorked)} per shift`}
          icon={<Clock3 className="size-4" />}
          accent="info"
        />
        <MetricTile
          label="Break / lunch"
          value={`${formatHm(totals.breaks)} / ${formatHm(totals.lunch)}`}
          hint="Combined for the selection"
          icon={<Coffee className="size-4" />}
          accent="warning"
        />
        <MetricTile
          label="Overrun time"
          value={formatHm(totals.overrun)}
          hint={`${compliancePct}% of shifts inside allowance`}
          icon={<UtensilsCrossed className="size-4" />}
          accent={totals.overrun > 0 ? "danger" : "success"}
        />
        <MetricTile
          label="Overtime"
          value={formatHm(totals.overtime)}
          hint="Worked past an 8h day"
          icon={<TimerReset className="size-4" />}
          accent={totals.overtime > 0 ? "warning" : "default"}
        />
      </div>

      {/* Toolbar + table */}
      <Card className="gap-0 overflow-hidden rounded-3xl p-0 shadow-card">
        <div className="flex flex-col gap-3 border-b border-border/60 bg-surface/50 p-4">
          <DateRangeTabs value={selection} onChange={setSelection} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[15rem] flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee, team or date…"
                  className="h-9 rounded-xl pl-9"
                />
              </div>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger className="h-9 w-[11rem] rounded-xl">
                  <Users className="size-4 text-muted-foreground" />
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(search || team !== "all" || selection.preset !== "7d") && (
                <Button
                  variant="ghost"
                  className="h-9 rounded-xl text-muted-foreground"
                  onClick={() => {
                    setSearch("");
                    setTeam("all");
                    setSelection({ preset: "7d" });
                  }}
                >
                  <TimerReset className="size-4" /> Reset
                </Button>
              )}
            </div>
            <p className="tabular text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
              {rows.length} records
            </p>
          </div>
        </div>

        <DataTable
          className="rounded-none border-0 shadow-none"
          columns={[
            {
              key: "employee",
              header: "Employee",
              cell: (r) => (
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-8 ring-1 ring-border/60">
                    <AvatarFallback className="bg-brand/10 text-[0.65rem] font-semibold text-brand">
                      {r.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.team}</p>
                  </div>
                </div>
              ),
            },
            { key: "date", header: "Date", cell: (r) => <span className="tabular">{r.work_date}</span> },
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
                  <span className="tabular rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                    +{formatHm(over)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                );
              },
            },
            {
              key: "overtime",
              header: "Overtime",
              align: "right",
              cell: (r) => {
                const ot = Math.max(0, r.worked - STANDARD_DAY_SECONDS);
                return ot > 0 ? (
                  <span className="tabular rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-brand-tan">
                    +{formatHm(ot)}
                  </span>
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
      </Card>

      {/* Exceptions */}
      <Card className="gap-0 overflow-hidden rounded-3xl p-0 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-surface/50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
              <AlertOctagon className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">
                Attendance Exceptions
              </h2>
              <p className="max-w-xl text-xs text-muted-foreground">
                Detected automatically from shift records — late sign-ins, early or missed sign-outs
                and break/lunch overruns. Follows the same date, team and search filters.
              </p>
            </div>
          </div>
          <span className="tabular rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
            {exceptions.length} exceptions
          </span>
        </div>

        <DataTable
          className="rounded-none border-0 shadow-none"
          columns={[
            {
              key: "employee",
              header: "Employee",
              cell: (r) => (
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{r.employee}</p>
                  <p className="text-xs text-muted-foreground">{r.team}</p>
                </div>
              ),
            },
            {
              key: "date",
              header: "Date",
              cell: (r) => <span className="tabular">{r.date}</span>,
            },
            {
              key: "type",
              header: "Type",
              cell: (r) => <StatusBadge status={r.type} tone={exceptionTone(r.type)} />,
            },
            {
              key: "detail",
              header: "Details",
              cell: (r) => <span className="text-sm text-muted-foreground">{r.detail}</span>,
            },
            {
              key: "minutes",
              header: "Impact",
              align: "right",
              cell: (r) =>
                r.minutes > 0 ? (
                  <span className="tabular font-medium text-destructive">{r.minutes} min</span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                ),
            },
          ]}
          rows={exceptions}
          empty={
            query.isLoading
              ? "Checking shift records…"
              : "No attendance exceptions for this selection — everyone stayed inside policy."
          }
        />
      </Card>
    </div>
  );
}

