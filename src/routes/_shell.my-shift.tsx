import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Coffee, LogIn, LogOut, Sandwich, PhoneCall, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Timeline } from "@/components/crm/Timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
    ],
  }),
  component: MyShiftPage,
});

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="My Shift"
        description="Your sign-in and sign-out are recorded automatically — breaks, lunch and available time are tracked for HR."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Refresh shift record"
              onClick={() => {
                void refreshSession();
                void dayQuery.refetch();
              }}
            >
              <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} />
            </Button>
            {signedIn ? (
              <Button
                variant="destructive"
                onClick={() => {
                  setStatus("Signed Out", "End of shift");
                  toast.success("Signed out — attendance recorded");
                }}
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setStatus("Available", "Ready for calls");
                  toast.success("Signed in — status set to Available");
                }}
              >
                <LogIn className="size-4" /> Sign in
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current status"
          value={<StatusBadge status={status} />}
          hint={`${formatDuration(statusSeconds)} in status`}
          tone={signedIn ? "brand" : "default"}
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label="Signed in at"
          value={formatClock(signedInAt)}
          hint={
            signedOutAt
              ? `Signed out ${formatClock(signedOutAt)}`
              : "Recorded automatically on login"
          }
        />
        <StatCard
          label="Worked today"
          value={formatHm(totals.workedSeconds)}
          hint={`Break ${formatHm(breakUsed)} · Lunch ${formatHm(lunchUsed)}`}
          tone="brand"
        />
        <StatCard
          label="Week to date"
          value={formatHm(weeklySeconds)}
          hint="Target 40h"
          tone="info"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Card className="gap-4 p-5 shadow-card">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Presence controls</h2>
              <p className="text-xs text-muted-foreground">
                Every change is saved to your attendance record instantly.
              </p>
            </div>
            <Separator />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant={status === "Available" ? "default" : "outline"}
                disabled={!signedIn}
                onClick={() => setStatus("Available", "Ready for calls")}
              >
                <PhoneCall className="size-4" /> Available
              </Button>
              <Button
                variant={status === "Break" ? "default" : "outline"}
                disabled={!signedIn}
                onClick={() => setStatus("Break")}
              >
                <Coffee className="size-4" /> Start break
              </Button>
              <Button
                variant={status === "Lunch" ? "default" : "outline"}
                disabled={!signedIn}
                onClick={() => setStatus("Lunch")}
              >
                <Sandwich className="size-4" /> Start lunch
              </Button>
              <Button
                variant={status === "Meeting" ? "default" : "outline"}
                disabled={!signedIn}
                onClick={() => setStatus("Meeting", "Team huddle")}
              >
                Meeting
              </Button>
              <Button
                variant={status === "Training" ? "default" : "outline"}
                disabled={!signedIn}
                onClick={() => setStatus("Training", "Course / coaching")}
              >
                Training
              </Button>
              <Button
                variant={status === "Not Available" ? "default" : "outline"}
                disabled={!signedIn}
                onClick={() => setStatus("Not Available", "Technical issue")}
              >
                Not available
              </Button>
            </div>
          </Card>

          <Card className="gap-4 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">Break allowance</h2>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Break ({Math.round(config.breakAllowanceSeconds / 60)} min allowance)</span>
                <span className="tabular">
                  {formatHm(breakUsed)} / {Math.round(config.breakAllowanceSeconds / 60)}m
                </span>
              </div>
              <Progress
                value={Math.min(100, (breakUsed / config.breakAllowanceSeconds) * 100)}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Lunch ({Math.round(config.lunchAllowanceSeconds / 60)} min allowance)</span>
                <span className="tabular">
                  {formatHm(lunchUsed)} / {Math.round(config.lunchAllowanceSeconds / 60)}m
                </span>
              </div>
              <Progress
                value={Math.min(100, (lunchUsed / config.lunchAllowanceSeconds) * 100)}
              />
            </div>
            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <p>
                Break overrun today:{" "}
                <span className="font-medium text-foreground tabular">
                  {formatHm(totals.breakOverrunSeconds)}
                </span>
              </p>
              <p>
                Lunch overrun today:{" "}
                <span className="font-medium text-foreground tabular">
                  {formatHm(totals.lunchOverrunSeconds)}
                </span>
              </p>
            </div>
            {allowanceSeconds !== null && overrunSeconds > 0 && (
              <p className="text-xs font-medium text-destructive">
                You are {formatDuration(overrunSeconds)} over the allowance — return to Available
                to clear the alarm.
              </p>
            )}
          </Card>

          <Card className="gap-4 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">Last 7 days</h2>
            {week.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No shift records yet — your first sign-in starts the history.
              </p>
            ) : (
              <div className="space-y-2">
                {week.map((s) => {
                  const worked = workedSeconds(s);
                  const date = new Date(`${s.work_date}T12:00:00`);
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="w-9 text-xs text-muted-foreground">
                        {DAY_LABELS[date.getDay()]}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${Math.min(100, (worked / maxDaySeconds) * 100)}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-xs tabular text-foreground">
                        {formatHm(worked)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <Card className="gap-4 p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground">Today's timeline</h2>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity recorded yet today.</p>
          ) : (
            <Timeline items={events.slice(-14)} />
          )}
        </Card>
      </div>
    </div>
  );
}
