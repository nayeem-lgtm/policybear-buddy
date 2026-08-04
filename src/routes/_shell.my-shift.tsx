import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Coffee, LogIn, LogOut, Sandwich, PhoneCall, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Timeline } from "@/components/crm/Timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { shiftTimeline } from "@/lib/mock-data";
import { formatDuration, useShift } from "@/context/ShiftContext";

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

const weeklyHours = [
  { day: "Mon", hours: 8.2 },
  { day: "Tue", hours: 8.0 },
  { day: "Wed", hours: 7.6 },
  { day: "Thu", hours: 8.4 },
  { day: "Fri", hours: 5.1 },
  { day: "Sat", hours: 0 },
  { day: "Sun", hours: 0 },
];

function MyShiftPage() {
  const { status, statusSeconds, signedIn, allowanceSeconds, overrunSeconds, setStatus, events } =
    useShift();
  const [signedInAtStr] = useState("07:00");

  const weeklyTotal = useMemo(
    () => weeklyHours.reduce((sum, d) => sum + d.hours, 0),
    [],
  );

  const breakUsedSeconds = status === "Break" ? statusSeconds : 0;
  const lunchUsedSeconds = status === "Lunch" ? statusSeconds : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="My Shift"
        description="Clock in, take breaks and lunch on schedule, and keep an eye on today's timeline."
        actions={
          signedIn ? (
            <Button
              variant="destructive"
              onClick={() => {
                setStatus("Signed Out", "End of shift");
                toast.success("Signed out — have a good evening");
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
          )
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
          value={signedIn ? signedInAtStr : "—"}
          hint="Standard Pacific 7:00–16:00"
        />
        <StatCard
          label="Overrun"
          value={`+${formatDuration(overrunSeconds)}`}
          hint={overrunSeconds > 0 ? "Over allowance" : "Within allowance"}
          tone={overrunSeconds > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Week to date"
          value={`${weeklyTotal.toFixed(1)}h`}
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
                Switch status to trigger the break/lunch allowance timers.
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
                variant="outline"
                disabled={!signedIn}
                onClick={() => setStatus("Meeting", "Team huddle")}
              >
                Meeting
              </Button>
            </div>
          </Card>

          <Card className="gap-4 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">Break allowance</h2>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Break (15 min allowance)</span>
                <span className="tabular">{formatDuration(breakUsedSeconds)} / 15:00</span>
              </div>
              <Progress value={Math.min(100, (breakUsedSeconds / (15 * 60)) * 100)} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Lunch (30 min allowance)</span>
                <span className="tabular">{formatDuration(lunchUsedSeconds)} / 30:00</span>
              </div>
              <Progress value={Math.min(100, (lunchUsedSeconds / (30 * 60)) * 100)} />
            </div>
            {allowanceSeconds !== null && overrunSeconds > 0 && (
              <p className="text-xs font-medium text-destructive">
                You are {formatDuration(overrunSeconds)} over the allowance — return to Available
                to clear the alarm.
              </p>
            )}
          </Card>

          <Card className="gap-4 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground">Weekly hours</h2>
            <div className="space-y-2">
              {weeklyHours.map((d) => (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="w-9 text-xs text-muted-foreground">{d.day}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.min(100, (d.hours / 8.5) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs tabular text-foreground">
                    {d.hours.toFixed(1)}h
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="gap-4 p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground">Today's timeline</h2>
          <Timeline items={[...shiftTimeline, ...events.slice(2)].slice(-12) as any} />
        </Card>
      </div>
    </div>
  );
}
