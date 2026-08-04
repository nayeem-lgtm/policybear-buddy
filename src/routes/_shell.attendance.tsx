import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock3, Download, TrendingUp, UserX } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { Timeline } from "@/components/crm/Timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employees } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance Register — Policy Bear CRM" },
      {
        name: "description",
        content: "Monthly attendance register with present/absent/late/holiday marks per employee.",
      },
      { property: "og:title", content: "Attendance Register — Policy Bear CRM" },
      {
        property: "og:description",
        content: "HR monthly attendance grid with drill-in punch detail per employee.",
      },
    ],
  }),
  component: AttendancePage,
});

type Mark = "P" | "A" | "L" | "H";

const MONTHS = [
  "January 2026",
  "February 2026",
  "March 2026",
  "April 2026",
  "May 2026",
  "June 2026",
  "July 2026",
  "August 2026",
];

const markLabel: Record<Mark, string> = {
  P: "Present",
  A: "Absent",
  L: "Late",
  H: "Holiday",
};

const markClass: Record<Mark, string> = {
  P: "bg-success/12 text-success",
  A: "bg-destructive/12 text-destructive",
  L: "bg-warning/22 text-brand-tan",
  H: "bg-muted text-muted-foreground",
};

const DAYS_IN_MONTH = 22; // weekday cadence for a working month

function markFor(empIndex: number, day: number): Mark {
  if (day === 8 || day === 16) return "H";
  const seed = (empIndex * 13 + day * 7) % 29;
  if (seed === 0) return "A";
  if (seed < 4) return "L";
  return "P";
}

function AttendancePage() {
  const roster = useMemo(() => employees.slice(0, 16), []);
  const [month, setMonth] = useState<string>(MONTHS[MONTHS.length - 1] as string);
  const [selected, setSelected] = useState<(typeof roster)[number] | null>(null);

  const days = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);

  const grid = useMemo(
    () =>
      roster.map((emp, i) => ({
        emp,
        marks: days.map((d) => markFor(i, d)),
      })),
    [roster],
  );

  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let total = 0;
    for (const row of grid) {
      for (const m of row.marks) {
        if (m === "H") continue;
        total += 1;
        if (m === "P") present += 1;
        if (m === "L") late += 1;
        if (m === "A") absent += 1;
      }
    }
    return {
      presentPct: total ? Math.round(((present + late) / total) * 100) : 0,
      late,
      absent,
      overtimeHours: 46.5,
    };
  }, [grid]);

  const selectedIndex = selected ? roster.findIndex((e) => e.id === selected.id) : -1;
  const selectedMarks = selectedIndex >= 0 ? (grid[selectedIndex]?.marks ?? []) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Attendance Register"
        description="Monthly presence register for every employee — drill in for daily punch detail."
        actions={
          <>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-9 w-44">
                <CalendarDays className="size-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => toast.success(`Attendance register for ${month} exported`)}
            >
              <Download className="size-4" /> Export
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Present rate"
          value={`${stats.presentPct}%`}
          hint={month}
          tone="success"
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard label="Late arrivals" value={stats.late} hint="Clocked in after grace" tone="warning" icon={<Clock3 className="size-4" />} />
        <StatCard label="Absences" value={stats.absent} hint="Unplanned" tone="danger" icon={<UserX className="size-4" />} />
        <StatCard label="Overtime hours" value={`${stats.overtimeHours}h`} hint="Payroll period" tone="info" />
      </div>

      <Card className="gap-0 overflow-hidden p-0 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface/70">
                <th className="sticky left-0 z-10 bg-surface/70 px-3 py-2 text-left text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                  Employee
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    className="w-8 px-1 py-2 text-center text-[0.65rem] font-medium text-muted-foreground"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => (
                <tr
                  key={row.emp.id}
                  className="cursor-pointer border-t border-border hover:bg-surface/50"
                  onClick={() => setSelected(row.emp)}
                >
                  <td className="sticky left-0 z-10 bg-card px-3 py-1.5 whitespace-nowrap">
                    <p className="font-medium text-foreground">{row.emp.name}</p>
                    <p className="text-xs text-muted-foreground">{row.emp.team}</p>
                  </td>
                  {row.marks.map((m, i) => (
                    <td key={i} className="px-1 py-1.5 text-center">
                      <span
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded text-[0.68rem] font-semibold",
                          markClass[m],
                        )}
                        title={markLabel[m]}
                      >
                        {m}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          {(Object.keys(markLabel) as Mark[]).map((m) => (
            <span key={m} className="inline-flex items-center gap-1.5">
              <span className={cn("inline-flex size-4 items-center justify-center rounded text-[0.6rem] font-semibold", markClass[m])}>
                {m}
              </span>
              {markLabel[m]}
            </span>
          ))}
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {month} punch detail · {selected?.title} · {selected?.team}
            </DialogDescription>
          </DialogHeader>
          <Timeline
            items={selectedMarks.slice(0, 10).map((m, i) => ({
              time: `Aug ${i + 1}`,
              event: markLabel[m],
              detail:
                m === "P"
                  ? "07:00 in · 16:02 out"
                  : m === "L"
                    ? "07:14 in · 16:00 out"
                    : m === "A"
                      ? "No punches recorded"
                      : "Company holiday",
              tone: m === "P" ? "success" : m === "L" ? "warning" : m === "A" ? "danger" : "muted",
            }))}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
