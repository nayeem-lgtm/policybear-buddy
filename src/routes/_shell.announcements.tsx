import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Megaphone, Pin, Plus, UserCircle2 } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { announcements as initialAnnouncements, currentUser } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — Policy Bear CRM" },
      {
        name: "description",
        content: "Company-wide announcements board with pinned updates and acknowledgements.",
      },
      { property: "og:title", content: "Announcements — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Company-wide announcements board with pinned updates and acknowledgements.",
      },
    ],
  }),
  component: AnnouncementsPage,
});

interface AnnouncementDraft {
  title: string;
  body: string;
  department: string;
  priority: "Normal" | "High";
  acknowledgeRequired: boolean;
}

const departments = ["Operations", "Sales", "Human Resources", "Accounting", "Executive", "Technical Administration"];

const emptyDraft: AnnouncementDraft = {
  title: "",
  body: "",
  department: "Operations",
  priority: "Normal",
  acknowledgeRequired: false,
};

function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AnnouncementDraft>(emptyDraft);

  const pinned = useMemo(
    () => [...announcements].sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "High" ? -1 : 1))[0],
    [announcements],
  );
  const rest = announcements.filter((a) => a.id !== pinned?.id);

  function submit() {
    if (!draft.title.trim() || !draft.body.trim()) return;
    setAnnouncements((prev) => [
      {
        id: `ANN-${prev.length + 1}`,
        title: draft.title,
        body: draft.body,
        author: currentUser.name,
        department: draft.department,
        date: new Date().toISOString().slice(0, 10),
        priority: draft.priority,
        acknowledgeRequired: draft.acknowledgeRequired,
        acknowledged: 0,
        audience: 24,
      },
      ...prev,
    ]);
    setDraft(emptyDraft);
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Announcements"
        description="Company-wide updates, policy changes, and department news."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> New announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New announcement</DialogTitle>
                <DialogDescription>
                  Post an update to the company announcements board. This is stored locally for this demo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ann-title">Title</Label>
                  <Input
                    id="ann-title"
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="e.g. New PTO request process"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ann-body">Message</Label>
                  <Textarea
                    id="ann-body"
                    value={draft.body}
                    onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                    placeholder="Write the announcement…"
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Select
                      value={draft.department}
                      onValueChange={(v) => setDraft((d) => ({ ...d, department: v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dep) => (
                          <SelectItem key={dep} value={dep}>
                            {dep}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select
                      value={draft.priority}
                      onValueChange={(v) => setDraft((d) => ({ ...d, priority: v as AnnouncementDraft["priority"] }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={!draft.title.trim() || !draft.body.trim()}>
                  Post announcement
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {pinned && (
        <Card className="gap-3 border-brand/30 bg-brand/5 p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Pin className="size-4 text-brand" />
            <span className="text-xs font-semibold tracking-wide text-brand uppercase">Pinned</span>
            <StatusBadge status={pinned.priority} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{pinned.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{pinned.body}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <UserCircle2 className="size-3.5" /> {pinned.author} · {pinned.department}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" /> {pinned.date}
            </span>
          </div>
          {pinned.acknowledgeRequired && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Acknowledged</span>
                <span className="tabular">{pinned.acknowledged}/{pinned.audience}</span>
              </div>
              <Progress value={(pinned.acknowledged / pinned.audience) * 100} className="h-1.5" />
            </div>
          )}
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">All announcements</p>
          <Badge variant="secondary">{rest.length}</Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {rest.map((a) => (
            <Card key={a.id} className="gap-2 p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-foreground">{a.title}</h4>
                <StatusBadge status={a.priority} />
              </div>
              <p className="text-sm text-muted-foreground">{a.body}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <UserCircle2 className="size-3.5" /> {a.author} · {a.department}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" /> {a.date}
                </span>
                {a.acknowledgeRequired && (
                  <Badge variant="outline" className="text-[0.65rem]">
                    {a.acknowledged}/{a.audience} acknowledged
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
