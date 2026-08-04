import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { List, User } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { callbacks, type Callback } from "@/lib/mock-data";
import { unique } from "@/lib/use-filters";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/callbacks/calendar")({
  head: () => ({
    meta: [
      { title: "Callback Calendar — Policy Bear CRM" },
      {
        name: "description",
        content: "Week and day calendar of scheduled callback slots by agent.",
      },
      { property: "og:title", content: "Callback Calendar — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Week and day calendar of scheduled callback slots by agent.",
      },
    ],
  }),
  component: CallbacksCalendarPage,
});

const days = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08"];
const dayLabels = ["Mon 3", "Tue 4", "Wed 5", "Thu 6", "Fri 7", "Sat 8"];
const hours = Array.from({ length: 11 }, (_, i) => 8 + i); // 8am - 6pm

function parseSlot(cb: Callback) {
  const [datePart, timePart] = cb.scheduledFor.split(" ");
  const hour = Number((timePart ?? "0:0").split(":")[0]);
  return { datePart: datePart ?? "", hour };
}

function priorityChipTone(priority: Callback["priority"]) {
  switch (priority) {
    case "Urgent":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "High":
      return "border-warning/45 bg-warning/20 text-brand-tan";
    case "Normal":
      return "border-brand-cyan/50 bg-brand-cyan/20 text-brand-teal";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function CallbacksCalendarPage() {
  const [agent, setAgent] = useState("all");
  const [view, setView] = useState<"week" | "day">("week");
  const [activeDay, setActiveDay] = useState<string>(days[1] as string);

  const agents = unique(callbacks, (c) => c.agent);

  const filtered = useMemo(
    () => callbacks.filter((c) => agent === "all" || c.agent === agent),
    [agent],
  );

  const visibleDays = view === "week" ? days : [activeDay];
  const visibleLabels = view === "week" ? dayLabels : [dayLabels[days.indexOf(activeDay)] ?? ""];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Callback Calendar"
        description="Week-at-a-glance view of every scheduled callback slot by agent."
        actions={
          <Button variant="outline" asChild>
            <Link to="/callbacks" className="flex items-center gap-1.5">
              <List className="size-4" /> Queue view
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={agent} onValueChange={setAgent}>
          <SelectTrigger className="h-9 w-56 gap-1.5">
            <User className="size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs value={view} onValueChange={(v) => setView(v as "week" | "day")}>
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
          </TabsList>
        </Tabs>

        {view === "day" && (
          <Select value={activeDay} onValueChange={setActiveDay}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {days.map((d, i) => (
                <SelectItem key={d} value={d}>
                  {dayLabels[i]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border shadow-card">
        <div
          className="grid min-w-[720px]"
          style={{ gridTemplateColumns: `4.5rem repeat(${visibleDays.length}, 1fr)` }}
        >
          <div className="border-b border-border bg-surface/70 p-2 text-xs font-semibold text-muted-foreground" />
          {visibleLabels.map((label) => (
            <div
              key={label}
              className="border-b border-l border-border bg-surface/70 p-2 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase"
            >
              {label}
            </div>
          ))}

          {hours.map((hour) => (
            <>
              <div key={`h-${hour}`} className="border-b border-border p-2 text-right text-xs text-muted-foreground">
                {hour % 12 === 0 ? 12 : hour % 12}:00 {hour < 12 ? "AM" : "PM"}
              </div>
              {visibleDays.map((day) => {
                const slotCallbacks = filtered.filter((cb) => {
                  const { datePart, hour: cbHour } = parseSlot(cb);
                  return datePart === day && cbHour === hour;
                });
                return (
                  <div
                    key={`${day}-${hour}`}
                    className="min-h-[3.25rem] space-y-1 border-b border-l border-border p-1"
                  >
                    {slotCallbacks.map((cb) => (
                      <div
                        key={cb.id}
                        className={cn(
                          "rounded-md border px-1.5 py-1 text-[0.7rem] leading-tight",
                          priorityChipTone(cb.priority),
                        )}
                        title={`${cb.customer} · ${cb.reason}`}
                      >
                        <p className="truncate font-medium">{cb.customer}</p>
                        <p className="truncate opacity-80">{cb.agent.split(" ")[0]} · {cb.priority}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Legend:</span>
        <span className="flex items-center gap-1"><StatusBadge status="Urgent" className="px-1.5 py-0" /> Urgent</span>
        <span className="flex items-center gap-1"><StatusBadge status="High" className="px-1.5 py-0" /> High</span>
        <span className="flex items-center gap-1"><StatusBadge status="Normal" className="px-1.5 py-0" /> Normal</span>
        <span className="flex items-center gap-1"><StatusBadge status="Low" className="px-1.5 py-0" /> Low</span>
      </div>
    </div>
  );
}
