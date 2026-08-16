import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Coffee,
  LogIn,
  LogOut,
  Sandwich,
  PhoneCall,
  RefreshCw,
  Users,
  GraduationCap,
  CircleSlash,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Timeline } from "@/components/crm/Timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDuration, useShift } from "@/context/ShiftContext";
import { getMyShiftDay } from "@/lib/shift.functions";
import { formatClock, formatHm, workedSeconds, type ShiftDay } from "@/lib/shift-shared";

export const Route = createFileRoute("/_shell/my-shift")({
  head: () => ({
    meta: [
      { title: "My Shift — Policy Bear CRM" },
      {
        name: "description",
        content: "Clock in and out, manage breaks and lunch, and review today's shift timeline.",
      },
      { property: "og:title", content: "My Shift — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Personal shift console with live timers, break allowances and weekly hours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyShiftPage,
});

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_TARGET_SECONDS = 40 * 3600;

/* ---------- small building blocks ---------- */

function Ring({
  value,
  size = 116,
  stroke = 10,
  tone = "brand",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "brand" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const toneClass = {
    brand: "text-brand",
    warning: "text-warning",
    danger: "text-destructive",
    info: "text-brand-cyan",
  }[tone];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="stroke-border/60"
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
  accent?: "default" | "brand" | "info" | "warning";
}) {
  const accentClass = {
    default: "bg-muted text-muted-foreground",
    brand: "bg-brand/10 text-brand",
    info: "bg-brand-cyan/25 text-brand-teal",
    warning: "bg-warning/25 text-brand-tan",
  }[accent];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 transition-colors hover:border-brand/30">
      {icon && (
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", accentClass)}>
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

function PresenceTile({
  icon,
  label,
  description,
  active,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "border-brand/50 bg-brand/8 shadow-card ring-1 ring-brand/20"
          : "border-border/60 bg-card hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-card",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          active ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground group-hover:text-brand",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function AllowanceBar({
  label,
  used,
  allowance,
  icon,
}: {
  label: string;
  used: number;
  allowance: number;
  icon: ReactNode;
}) {
  const pct = Math.min(100, (used / Math.max(1, allowance)) * 100);
  const over = used > allowance;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </span>
          {label}
        </span>
        <span
          className={cn(
            "tabular text-xs font-semibold",
            over ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {formatHm(used)} / {Math.round(allowance / 60)}m
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            over ? "bg-destructive" : "bg-brand",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- page ---------- */

function MyShiftPage() {
  const {
    status,
    statusSeconds,
    signedIn,
    allowanceSeconds,
    overrunSeconds,
    setStatus,
    events,
    totals,
    signedInAt,
    signedOutAt,
    session,
    syncing,
    refreshSession,
    config,
  } = useShift();

  const loadDay = useServerFn(getMyShiftDay);
  const dayQuery = useQuery({
    queryKey: ["my-shift-day", session?.id ?? "none"],
    queryFn: () => loadDay() as Promise<ShiftDay>,
    refetchInterval: 60_000,
  });

  const week = dayQuery.data?.week ?? [];
  const weeklySeconds = week.reduce((sum, s) => sum + workedSeconds(s), 0);
  const maxDaySeconds = Math.max(8.5 * 3600, ...week.map((s) => workedSeconds(s)));

  const breakUsed = totals.breakSeconds;
  const lunchUsed = totals.lunchSeconds;
  const dayTarget = 8.5 * 3600;
  const dayPct = Math.min(100, (totals.workedSeconds / dayTarget) * 100);
  const weekPct = Math.min(100, (weeklySeconds / WEEK_TARGET_SECONDS) * 100);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <Card className="brand-gradient relative gap-0 overflow-hidden rounded-3xl border-0 p-0 text-brand-foreground shadow-raised">
        <div className="brand-mesh absolute inset-0 opacity-90" aria-hidden />
        <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <Ring value={dayPct} tone="info">
              <span className="tabular font-display text-xl leading-none font-semibold text-brand-foreground">
                {formatHm(totals.workedSeconds)}
              </span>
              <span className="mt-1 text-[0.6rem] tracking-[0.14em] text-brand-foreground/60 uppercase">
                worked
              </span>
            </Ring>
            <div className="space-y-2">
              <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-brand-foreground/60 uppercase">
                My shift · today
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <span className="tabular rounded-full bg-brand-foreground/12 px-2.5 py-1 text-xs font-medium text-brand-foreground/85">
                  {formatDuration(statusSeconds)} in status
                </span>
              </div>
              <p className="text-sm text-brand-foreground/70">
                Signed in {formatClock(signedInAt)}
                {signedOutAt ? ` · signed out ${formatClock(signedOutAt)}` : " · tracking live"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh shift record"
              className="text-brand-foreground hover:bg-brand-foreground/12 hover:text-brand-foreground"
              onClick={() => {
                void refreshSession();
                void dayQuery.refetch();
              }}
            >
              <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} />
            </Button>
            {signedIn ? (
              <Button
                size="lg"
                variant="destructive"
                className="rounded-xl"
                onClick={() => {
                  setStatus("Signed Out", "End of shift");
                  toast.success("Signed out — attendance recorded");
                }}
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            ) : (
              <Button
                size="lg"
                className="rounded-xl bg-brand-foreground text-brand hover:bg-brand-foreground/90"
                onClick={() => {
                  setStatus("Available", "Ready for calls");
                  toast.success("Signed in — status set to Available");
                }}
              >
                <LogIn className="size-4" /> Sign in
              </Button>
            )}
          </div>
        </div>

        {allowanceSeconds !== null && overrunSeconds > 0 && (
          <div className="relative border-t border-brand-foreground/15 bg-destructive/85 px-6 py-2.5 text-xs font-medium">
            You are {formatDuration(overrunSeconds)} over the allowance — return to Available to
            clear the alarm.
          </div>
        )}
      </Card>

      {/* Quick metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Break used"
          value={formatHm(breakUsed)}
          hint={`Overrun ${formatHm(totals.breakOverrunSeconds)}`}
          icon={<Coffee className="size-4" />}
          accent="warning"
        />
        <MetricTile
          label="Lunch used"
          value={formatHm(lunchUsed)}
          hint={`Overrun ${formatHm(totals.lunchOverrunSeconds)}`}
          icon={<Sandwich className="size-4" />}
          accent="warning"
        />
        <MetricTile
          label="Week to date"
          value={formatHm(weeklySeconds)}
          hint={`${Math.round(weekPct)}% of 40h target`}
          icon={<CalendarDays className="size-4" />}
          accent="info"
        />
        <MetricTile
          label="Daily target"
          value={`${Math.round(dayPct)}%`}
          hint="Based on 8h 30m shift"
          icon={<TrendingUp className="size-4" />}
          accent="brand"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          {/* Presence */}
          <Card className="gap-4 rounded-3xl border-border/60 p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Presence controls
                </h2>
                <p className="text-xs text-muted-foreground">
                  Tap a state — every change saves to your attendance record instantly.
                </p>
              </div>
              {!signedIn && (
                <span className="rounded-full bg-muted px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                  Sign in first
                </span>
              )}
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <PresenceTile
                icon={<PhoneCall className="size-4" />}
                label="Available"
                description="Ready for calls"
                active={status === "Available"}
                disabled={!signedIn}
                onClick={() => setStatus("Available", "Ready for calls")}
              />
              <PresenceTile
                icon={<Coffee className="size-4" />}
                label="Break"
                description={`${Math.round(config.breakAllowanceSeconds / 60)} min allowance`}
                active={status === "Break"}
                disabled={!signedIn}
                onClick={() => setStatus("Break")}
              />
              <PresenceTile
                icon={<Sandwich className="size-4" />}
                label="Lunch"
                description={`${Math.round(config.lunchAllowanceSeconds / 60)} min allowance`}
                active={status === "Lunch"}
                disabled={!signedIn}
                onClick={() => setStatus("Lunch")}
              />
              <PresenceTile
                icon={<Users className="size-4" />}
                label="Meeting"
                description="Team huddle"
                active={status === "Meeting"}
                disabled={!signedIn}
                onClick={() => setStatus("Meeting", "Team huddle")}
              />
              <PresenceTile
                icon={<GraduationCap className="size-4" />}
                label="Training"
                description="Course / coaching"
                active={status === "Training"}
                disabled={!signedIn}
                onClick={() => setStatus("Training", "Course / coaching")}
              />
              <PresenceTile
                icon={<CircleSlash className="size-4" />}
                label="Not available"
                description="Technical issue"
                active={status === "Not Available"}
                disabled={!signedIn}
                onClick={() => setStatus("Not Available", "Technical issue")}
              />
            </div>
          </Card>

          {/* Allowances */}
          <Card className="gap-4 rounded-3xl border-border/60 p-5 shadow-card">
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">
                Break allowance
              </h2>
              <p className="text-xs text-muted-foreground">
                Stay inside the bar — overruns are flagged to HR automatically.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AllowanceBar
                label="Break"
                used={breakUsed}
                allowance={config.breakAllowanceSeconds}
                icon={<Coffee className="size-3.5" />}
              />
              <AllowanceBar
                label="Lunch"
                used={lunchUsed}
                allowance={config.lunchAllowanceSeconds}
                icon={<Sandwich className="size-3.5" />}
              />
            </div>
          </Card>

          {/* Week */}
          <Card className="gap-4 rounded-3xl border-border/60 p-5 shadow-card">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-foreground">Last 7 days</h2>
              <span className="tabular text-xs text-muted-foreground">
                {formatHm(weeklySeconds)} of 40h
              </span>
            </div>
            {week.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No shift records yet — your first sign-in starts the history.
              </p>
            ) : (
              <div className="space-y-2.5">
                {week.map((s) => {
                  const worked = workedSeconds(s);
                  const date = new Date(`${s.work_date}T12:00:00`);
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="w-9 text-xs font-medium text-muted-foreground">
                        {DAY_LABELS[date.getDay()]}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand to-brand-cyan transition-[width] duration-500"
                          style={{ width: `${Math.min(100, (worked / maxDaySeconds) * 100)}%` }}
                        />
                      </div>
                      <span className="tabular w-16 text-right text-xs font-medium text-foreground">
                        {formatHm(worked)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Timeline */}
        <Card className="h-fit gap-4 rounded-3xl border-border/60 p-5 shadow-card lg:sticky lg:top-4">
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              Today&apos;s timeline
            </h2>
            <p className="text-xs text-muted-foreground">Latest activity first-hand from your record.</p>
          </div>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity recorded yet today.</p>
          ) : (
            <div className="max-h-[520px] overflow-y-auto pr-1">
              <Timeline items={events.slice(-14)} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
