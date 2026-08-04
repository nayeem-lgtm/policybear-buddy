import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  FileText,
  Mic,
  Paperclip,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Pin,
  Plus,
  Search,
  Send,
  Smile,
  Users,
  Video,
} from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  conversations as seedConversations,
  internalCalls,
  type ChatMessage,
  type Conversation,
} from "@/lib/mock-messaging";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/messages")({
  head: () => ({
    meta: [
      { title: "Messages & Calls — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Internal chat, team channels and voice or video calling for every Policy Bear department in one place.",
      },
      { property: "og:title", content: "Messages & Calls — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Internal chat, team channels and voice or video calling for every Policy Bear department.",
      },
    ],
  }),
  component: MessagesPage,
});

const presenceDot: Record<Conversation["presence"], string> = {
  online: "bg-success",
  away: "bg-warning",
  break: "bg-brand-cyan",
  offline: "bg-muted-foreground/40",
};

const presenceLabel: Record<Conversation["presence"], string> = {
  online: "Available",
  away: "Away",
  break: "On break",
  offline: "Offline",
};

function MessagesPage() {
  const [threads, setThreads] = useState<Conversation[]>(seedConversations);
  const [activeId, setActiveId] = useState(seedConversations[0]!.id);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [draft, setDraft] = useState("");
  const [call, setCall] = useState<{ name: string; kind: "voice" | "video" } | null>(null);

  const active = threads.find((t) => t.id === activeId) ?? threads[0]!;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads
      .filter((t) => (tab === "all" ? true : tab === "dm" ? t.kind === "dm" : t.kind !== "dm"))
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q))
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }, [threads, query, tab]);

  const totalUnread = threads.reduce((sum, t) => sum + t.unread, 0);

  function send() {
    const body = draft.trim();
    if (!body) return;
    const message: ChatMessage = {
      id: `local-${Date.now()}`,
      author: "Amelia Carter",
      initials: "AC",
      body,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      mine: true,
    };
    setThreads((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? { ...t, messages: [...t.messages, message], subtitle: `You: ${body}`, unread: 0 }
          : t,
      ),
    );
    setDraft("");
  }

  function openThread(id: string) {
    setActiveId(id);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Workspace"
        title="Messages & Calls"
        description="Chat one-to-one, in team groups or company channels — and start an internal voice or video call without leaving the CRM."
        actions={
          <>
            <Badge variant="secondary" className="gap-1">
              <Bell className="size-3.5" /> {totalUnread} unread
            </Badge>
            <Button size="sm" variant="outline">
              <Users className="size-4" /> New group
            </Button>
            <Button size="sm">
              <Plus className="size-4" /> New chat
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)_18rem]">
        {/* Conversation list */}
        <Card className="gap-0 overflow-hidden p-0 shadow-card">
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people, groups, channels…"
                className="h-9 pl-9"
              />
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">
                  All
                </TabsTrigger>
                <TabsTrigger value="dm" className="flex-1">
                  Direct
                </TabsTrigger>
                <TabsTrigger value="groups" className="flex-1">
                  Groups
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ScrollArea className="h-[26rem] lg:h-[34rem]">
            <ul className="divide-y divide-border">
              {visible.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openThread(t.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-surface/70",
                      t.id === active.id && "bg-surface",
                    )}
                  >
                    <span className="relative shrink-0">
                      <Avatar className="size-9">
                        <AvatarFallback className="text-xs">{t.initials}</AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card",
                          presenceDot[t.presence],
                        )}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {t.name}
                        </span>
                        {t.pinned && <Pin className="size-3 shrink-0 text-brand" />}
                        {t.muted && (
                          <BellOff className="size-3 shrink-0 text-muted-foreground" />
                        )}
                        <span className="tabular ml-auto shrink-0 text-[0.68rem] text-muted-foreground">
                          {t.lastAt}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-xs text-muted-foreground">
                          {t.subtitle}
                        </span>
                        {t.unread > 0 && (
                          <span className="tabular ml-auto shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[0.65rem] font-semibold text-brand-foreground">
                            {t.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {visible.length === 0 && (
                <li className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No conversations match that search.
                </li>
              )}
            </ul>
          </ScrollArea>
        </Card>

        {/* Thread */}
        <Card className="flex min-h-[34rem] flex-col gap-0 overflow-hidden p-0 shadow-card">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="relative">
              <Avatar className="size-9">
                <AvatarFallback className="text-xs">{active.initials}</AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card",
                  presenceDot[active.presence],
                )}
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{active.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {presenceLabel[active.presence]}
                {active.kind !== "dm" && ` · ${active.members} members`}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                size="icon"
                variant="outline"
                aria-label="Start voice call"
                onClick={() => setCall({ name: active.name, kind: "voice" })}
              >
                <Phone className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Start video call"
                onClick={() => setCall({ name: active.name, kind: "video" })}
              >
                <Video className="size-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4 px-4 py-4">
              {active.messages.map((m) => (
                <MessageRow key={m.id} message={m} />
              ))}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <Button size="icon" variant="ghost" aria-label="Attach file">
                <Paperclip className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Add emoji">
                <Smile className="size-4" />
              </Button>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`Message ${active.name}…`}
                className="max-h-28 min-h-10 resize-none py-2"
              />
              <Button size="icon" variant="ghost" aria-label="Record voice note">
                <Mic className="size-4" />
              </Button>
              <Button size="icon" onClick={send} aria-label="Send message">
                <Send className="size-4" />
              </Button>
            </div>
            <p className="mt-1.5 pl-1 text-[0.68rem] text-muted-foreground">
              Enter to send · Shift + Enter for a new line
            </p>
          </div>
        </Card>

        {/* Right rail */}
        <div className="space-y-4 xl:block">
          <Card className="gap-3 p-4 shadow-card">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Conversation details
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium text-foreground capitalize">{active.kind}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Members</span>
                <span className="tabular font-medium text-foreground">{active.members}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Notifications</span>
                <StatusBadge status={active.muted ? "Paused" : "Active"} />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Shared files
              </p>
              {active.messages.filter((m) => m.attachment).length === 0 && (
                <p className="text-xs text-muted-foreground">No files shared yet.</p>
              )}
              {active.messages
                .filter((m) => m.attachment)
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-xs">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {m.attachment!.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{m.attachment!.meta}</span>
                  </div>
                ))}
            </div>
          </Card>

          <Card className="gap-3 p-4 shadow-card">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Recent internal calls
            </p>
            <ul className="space-y-2.5">
              {internalCalls.map((c) => (
                <li key={c.id} className="flex items-center gap-2.5">
                  {c.status === "Missed" ? (
                    <PhoneMissed className="size-4 shrink-0 text-destructive" />
                  ) : c.direction === "incoming" ? (
                    <PhoneIncoming className="size-4 shrink-0 text-success" />
                  ) : (
                    <PhoneOutgoing className="size-4 shrink-0 text-brand" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.party}</p>
                    <p className="truncate text-[0.68rem] text-muted-foreground">
                      {c.kind === "video" ? "Video" : "Voice"} · {c.when}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-xs text-muted-foreground">
                    {c.duration}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Dialog open={!!call} onOpenChange={(open) => !open && setCall(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {call?.kind === "video" ? "Video call" : "Voice call"} · {call?.name}
            </DialogTitle>
            <DialogDescription>
              Connecting over the Policy Bear internal calling service…
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4">
            <Avatar className="size-20">
              <AvatarFallback className="text-lg">
                {call?.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">Ringing…</p>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" aria-label="Mute">
                <Mic className="size-4" />
              </Button>
              <Button size="icon" variant="outline" aria-label="Toggle video">
                <Video className="size-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" className="w-full" onClick={() => setCall(null)}>
              <Phone className="size-4" /> End call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageRow({ message }: { message: ChatMessage }) {
  if (message.callSummary) {
    const { direction, duration, missed } = message.callSummary;
    return (
      <div className="flex justify-center">
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs text-muted-foreground">
          {missed ? (
            <PhoneMissed className="size-3.5 text-destructive" />
          ) : direction === "incoming" ? (
            <PhoneIncoming className="size-3.5 text-success" />
          ) : (
            <PhoneOutgoing className="size-3.5 text-brand" />
          )}
          {missed ? "Missed voice call" : `Voice call · ${duration}`}
          <span className="tabular">{message.time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2.5", message.mine && "flex-row-reverse")}>
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="text-[0.65rem]">{message.initials}</AvatarFallback>
      </Avatar>
      <div className={cn("max-w-[80%] min-w-0", message.mine && "text-right")}>
        <p className="mb-1 text-[0.68rem] text-muted-foreground">
          {message.mine ? "You" : message.author} · {message.time}
        </p>
        {message.body && (
          <div
            className={cn(
              "inline-block rounded-lg px-3 py-2 text-left text-sm",
              message.mine
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-surface text-foreground",
            )}
          >
            {message.body}
          </div>
        )}
        {message.attachment && (
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left">
            <FileText className="size-4 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {message.attachment.name}
              </p>
              <p className="text-[0.68rem] text-muted-foreground">{message.attachment.meta}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
