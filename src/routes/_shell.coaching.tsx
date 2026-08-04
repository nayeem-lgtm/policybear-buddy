import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Target, CalendarClock, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { useFilters, unique } from "@/lib/use-filters";
import { employees } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_shell/coaching")({
  head: () => ({
    meta: [
      { title: "Coaching & PIPs — Policy Bear CRM" },
      {
        name: "description",
        content: "Coaching sessions and performance improvement plans with coach, focus area and outcomes.",
      },
      { property: "og:title", content: "Coaching & PIPs — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Coaching sessions and performance improvement plans with coach, focus area and outcomes.",
      },
    ],
  }),
  component: CoachingPage,
});

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length] as T;
}

interface CoachingSession {
  id: string;
  agent: string;
  coach: string;
  focusArea: string;
  type: "Coaching" | "PIP";
  followUpDate: string;
  outcome: "Improving" | "On Track" | "At Risk" | "Completed" | "Pending";
}

const focusAreas = [
  "Objection handling",
  "Compliant call openings",
  "Closing technique",
  "Attendance reliability",
  "Product knowledge",
  "QA scorecard accuracy",
];
const coaches = ["Nadia Rahimi", "Owen Klein", "Talia Bennett", "Isabel Moreno"];

const sessions: CoachingSession[] = Array.from({ length: 16 }, (_, i) => ({
  id: `CO-${900 + i}`,
  agent: pick(employees, i % 12).name,
  coach: pick(coaches, i),
  focusArea: pick(focusAreas, i),
  type: i % 5 === 0 ? "PIP" : "Coaching",
  followUpDate: `2026-08-${8 + (i % 15)}`,
  outcome: pick(["Improving", "On Track", "At Risk", "Completed", "Pending"] as const, i),
}));

const needsCoaching = employees
  .filter((e) => e.trainingProgress < 65 || e.role === "Agent")
  .slice(0, 6);

function CoachingPage() {
  const typeOptions = useMemo(() => unique(sessions, (s) => s.type), []);
  const outcomeOptions = useMemo(() => unique(sessions, (s) => s.outcome), []);
  const coachOptions = useMemo(() => unique(sessions, (s) => s.coach), []);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(sessions, {
    searchFields: (s) => [s.agent, s.coach, s.focusArea],
    filters: {
      type: (s) => s.type,
      outcome: (s) => s.outcome,
      coach: (s) => s.coach,
    },
  });

  const pipCount = sessions.filter((s) => s.type === "PIP").length;
  const atRisk = sessions.filter((s) => s.outcome === "At Risk").length;
  const completed = sessions.filter((s) => s.outcome === "Completed").length;

  const columns: Column<CoachingSession>[] = [
    { key: "agent", header: "Agent", cell: (s) => s.agent },
    { key: "type", header: "Type", cell: (s) => <Badge variant={s.type === "PIP" ? "destructive" : "secondary"}>{s.type}</Badge> },
    { key: "coach", header: "Coach", cell: (s) => s.coach },
    { key: "focusArea", header: "Focus Area", cell: (s) => s.focusArea },
    { key: "followUp", header: "Follow-up", cell: (s) => s.followUpDate },
    { key: "outcome", header: "Outcome", cell: (s) => <StatusBadge status={s.outcome} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Coaching & PIPs"
        description="Coaching sessions, performance improvement plans and agents flagged for extra support."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Sessions" value={sessions.length} icon={<GraduationCap className="size-4" />} />
        <StatCard label="Active PIPs" value={pipCount} tone="danger" icon={<Target className="size-4" />} />
        <StatCard label="At Risk" value={atRisk} tone="warning" icon={<CalendarClock className="size-4" />} />
        <StatCard label="Completed This Quarter" value={completed} tone="success" icon={<TrendingUp className="size-4" />} />
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Agents needing coaching</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {needsCoaching.map((e) => (
            <Card key={e.id} className="gap-2 p-4 shadow-card">
              <div className="flex items-center gap-2.5">
                <Avatar className="size-9">
                  <AvatarFallback>{e.avatarInitials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{e.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.title}</p>
                </div>
              </div>
              <div className="mt-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Training progress</span>
                  <span>{e.trainingProgress}%</span>
                </div>
                <Progress value={e.trainingProgress} className="mt-1 h-1.5" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by agent, coach or focus area…"
        filters={[
          { key: "type", label: "Type", options: typeOptions },
          { key: "outcome", label: "Outcome", options: outcomeOptions },
          { key: "coach", label: "Coach", options: coachOptions },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} footer={<span>{filtered.length} of {sessions.length} sessions</span>} />
    </div>
  );
}
