import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, GraduationCap, Clock, PlayCircle, FileText, ClipboardCheck } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { courses, lessonsByCourse, type Course } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_shell/training")({
  head: () => ({
    meta: [
      { title: "Training Academy — Policy Bear CRM" },
      {
        name: "description",
        content: "Course catalog, lesson progress and end-of-course exams and surveys.",
      },
      { property: "og:title", content: "Training Academy — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Course catalog, lesson progress and end-of-course exams and surveys.",
      },
    ],
  }),
  component: TrainingPage,
});

const hueClass: Record<string, string> = {
  brand: "bg-brand/15",
  cyan: "bg-brand-cyan/20",
  yellow: "bg-warning/20",
  teal: "bg-brand-teal/20",
  orange: "bg-warning/25",
  lavender: "bg-brand/10",
};

const sampleQuestions: Record<string, string[]> = {
  Exam: [
    "Which disclosure must be read verbatim before collecting SSN?",
    "What is the maximum household income to qualify for a subsidy in this scenario?",
    "Identify the correct special enrollment period trigger.",
  ],
  Survey: [
    "How confident do you feel using the quote engine unsupervised?",
    "What part of this course could be clearer?",
    "Rate the pacing of this course from 1–5.",
  ],
};

function TrainingPage() {
  const [tab, setTab] = useState("enrolled");
  const [selected, setSelected] = useState<Course | null>(null);

  const enrolled = courses.filter((c) => c.progress > 0);
  const available = courses.filter((c) => c.progress === 0);
  const shown = tab === "enrolled" ? enrolled : available;

  const avgProgress = Math.round(
    enrolled.reduce((s, c) => s + c.progress, 0) / (enrolled.length || 1),
  );
  const completedCount = courses.filter((c) => c.progress === 100).length;
  const requiredDue = courses.filter((c) => c.required && c.progress < 100).length;

  const lessons = selected ? (lessonsByCourse[selected.id] ?? lessonsByCourse["default"] ?? []) : [];
  const completedLessons = lessons.filter((l) => l.completed).length;
  const pct = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0;

  const lessonIcon = (type: string) =>
    type === "Video" ? PlayCircle : type === "Reading" ? FileText : ClipboardCheck;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Training Academy"
        description="Course catalog with progress tracking, lesson completion and end-of-course assessments."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Enrolled Courses" value={enrolled.length} icon={<BookOpen className="size-4" />} />
        <StatCard label="Avg. Progress" value={`${avgProgress}%`} icon={<GraduationCap className="size-4" />} />
        <StatCard label="Completed" value={completedCount} tone="success" icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Required & Due" value={requiredDue} tone="warning" icon={<Clock className="size-4" />} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="enrolled">Enrolled ({enrolled.length})</TabsTrigger>
          <TabsTrigger value="available">Available ({available.length})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="pt-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((c) => (
              <Card key={c.id} className="cursor-pointer gap-0 overflow-hidden p-0 shadow-card" onClick={() => setSelected(c)}>
                <div className={`flex h-24 items-center justify-center ${hueClass[c.thumbnailHue] ?? "bg-muted"}`}>
                  <BookOpen className="size-8 text-foreground/60" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{c.title}</p>
                    {c.required && <Badge variant="destructive" className="shrink-0">Required</Badge>}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.lessons} lessons · {c.durationMinutes}m</span>
                    <span>{c.category}</span>
                  </div>
                  <Progress value={c.progress} className="h-1.5" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.progress}% complete</span>
                    <span>Due {c.dueDate}</span>
                  </div>
                </div>
              </Card>
            ))}
            {shown.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                No courses in this view.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>{selected.description}</SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Course progress</span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Lessons</p>
                  {lessons.map((l) => {
                    const Icon = lessonIcon(l.type);
                    return (
                      <div key={l.id} className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm">
                        <div className="flex items-center gap-2.5">
                          <Icon className="size-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">{l.title}</p>
                            <p className="text-xs text-muted-foreground">{l.type} · {l.durationMinutes}m</p>
                          </div>
                        </div>
                        {l.completed ? (
                          <CheckCircle2 className="size-4 text-success" />
                        ) : (
                          <Button size="sm" variant="outline">Start</Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selected.assessment !== "None" && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {selected.assessment === "Exam" ? "Final exam" : "Course survey"}
                      </p>
                      <p className="mb-2 text-xs text-muted-foreground">
                        {selected.assessment === "Exam"
                          ? `Passing score: ${selected.passingScore}%`
                          : "Optional feedback survey"}
                      </p>
                      <div className="space-y-2">
                        {(sampleQuestions[selected.assessment] ?? []).map((q, i) => (
                          <div key={i} className="rounded-md border border-border p-2.5 text-sm text-foreground">
                            {i + 1}. {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
