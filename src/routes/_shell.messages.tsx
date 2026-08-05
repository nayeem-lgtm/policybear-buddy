import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellOff,
  FileText,
  Hash,
  Loader2,
  Paperclip,
  Phone,
  PhoneMissed,
  Pin,
  Plus,
  Search,
  Send,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";
import { supabase } from "@/integrations/supabase/client";
import {
  addMembers,
  createGroupConversation,
  ensureDirectConversation,
  fetchConversations,
  fetchMessages,
  fetchStaff,
  formatRelative,
  formatTime,
  markConversationRead,
  sendMessage,
  setMemberFlags,
  signedAttachmentUrl,
  uploadAttachment,
  type ConversationView,
  type MessageRecord,
  type StaffProfile,
} from "@/lib/messaging";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Live internal chat, group channels, file sharing and voice or video calling for every Policy Bear department.",
      },
      { property: "og:title", content: "Messages — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Live internal chat, group channels, file sharing and voice or video calling for every Policy Bear department.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MessagesPage,
});

const presenceTone: Record<string, string> = {
  online: "bg-success",
  away: "bg-warning",
  break: "bg-warning",
  offline: "bg-muted-foreground",
};

function MessagesPage() {
  const { user } = useAuth();
  const { startCall } = useCall();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "dm" | "group" | "channel">("all");
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const userId = user?.id ?? "";

  const conversationsQuery = useQuery({
    queryKey: ["conversations", userId],
    queryFn: () => fetchConversations(userId),
    enabled: !!userId,
  });

  const staffQuery = useQuery({ queryKey: ["staff"], queryFn: fetchStaff, enabled: !!userId });

  const conversations = conversationsQuery.data ?? [];
  const active = conversations.find((c) => c.id === activeId) ?? null;

  const messagesQuery = useQuery({
    queryKey: ["messages", activeId],
    queryFn: () => fetchMessages(activeId!),
    enabled: !!activeId,
  });

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0]!.id);
  }, [activeId, conversations]);

  // Live updates for conversations and the open thread.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("messaging-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["messages"] });
        void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_members" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  useEffect(() => {
    if (!activeId || !userId) return;
    void markConversationRead(activeId, userId).then(() =>
      queryClient.invalidateQueries({ queryKey: ["conversations", userId] }),
    );
  }, [activeId, queryClient, userId, messagesQuery.data?.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messagesQuery.data]);

  const sendMutation = useMutation({
    mutationFn: async (payload: { body: string; file?: File }) => {
      if (!activeId || !userId) return;
      if (payload.file) {
        const attachment = await uploadAttachment(payload.file, userId);
        await sendMessage({ conversationId: activeId, senderId: userId, body: payload.body, attachment });
        return;
      }
      await sendMessage({ conversationId: activeId, senderId: userId, body: payload.body });
    },
    onSuccess: () => {
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return conversations
      .filter((c) => (tab === "all" ? true : c.kind === tab))
      .filter((c) => (term ? c.name.toLowerCase().includes(term) : true))
      .sort((a, b) => {
        if (a.membership.pinned !== b.membership.pinned) return a.membership.pinned ? -1 : 1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
  }, [conversations, search, tab]);

  const staffById = useMemo(
    () => new Map((staffQuery.data ?? []).map((s) => [s.id, s] as const)),
    [staffQuery.data],
  );

  const dmPeer =
    active?.kind === "dm" ? active.members.find((m) => m.id !== userId) ?? null : null;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    sendMutation.mutate(
      { body: draft, file },
      { onSettled: () => setUploading(false) },
    );
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Workspace"
        title="Messages"
        description="Direct messages, team groups and company channels with file sharing and in-app calling."
        actions={
          <NewConversationDialog
            staff={(staffQuery.data ?? []).filter((s) => s.id !== userId)}
            userId={userId}
            onCreated={async (id) => {
              await queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
              setActiveId(id);
            }}
          />
        }
      />

      <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="flex h-[calc(100vh-15rem)] min-h-[28rem] flex-col gap-0 overflow-hidden p-0 shadow-card">
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="h-9 pl-8"
              />
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="dm">DMs</TabsTrigger>
                <TabsTrigger value="group">Groups</TabsTrigger>
                <TabsTrigger value="channel">Channels</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            {conversationsQuery.isLoading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No conversations yet. Start one with the “New” button.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(conversation.id)}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent",
                        conversation.id === activeId && "bg-accent",
                      )}
                    >
                      <div className="relative">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-brand/10 text-xs font-semibold text-brand">
                            {conversation.kind === "channel" ? "#" : conversation.avatar_initials}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.kind === "dm" && (
                          <span
                            className={cn(
                              "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card",
                              presenceTone[
                                conversation.members.find((m) => m.id !== userId)?.presence ?? "offline"
                              ] ?? "bg-muted-foreground",
                            )}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-foreground">
                            {conversation.name}
                          </p>
                          {conversation.membership.pinned && (
                            <Pin className="size-3 shrink-0 text-brand" />
                          )}
                          {conversation.membership.muted && (
                            <BellOff className="size-3 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {conversation.last_message_preview || "No messages yet"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[0.65rem] text-muted-foreground">
                          {formatRelative(conversation.last_message_at)}
                        </span>
                        {conversation.unread > 0 && (
                          <Badge className="h-4 min-w-4 justify-center px-1 text-[0.65rem]">
                            {conversation.unread}
                          </Badge>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </Card>

        <Card className="flex h-[calc(100vh-15rem)] min-h-[28rem] flex-col gap-0 overflow-hidden p-0 shadow-card">
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
              Select a conversation to start messaging.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-brand/10 text-xs font-semibold text-brand">
                      {active.kind === "channel" ? "#" : active.avatar_initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{active.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {active.kind === "dm"
                        ? `${dmPeer?.title ?? ""}${dmPeer?.presence ? ` · ${dmPeer.presence}` : ""}`
                        : `${active.members.length} members${active.topic ? ` · ${active.topic}` : ""}`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Voice call"
                    disabled={!dmPeer}
                    onClick={() =>
                      dmPeer &&
                      void startCall(
                        { id: dmPeer.id, name: dmPeer.name, initials: dmPeer.avatar_initials },
                        "voice",
                        active.id,
                      )
                    }
                  >
                    <Phone className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Video call"
                    disabled={!dmPeer}
                    onClick={() =>
                      dmPeer &&
                      void startCall(
                        { id: dmPeer.id, name: dmPeer.name, initials: dmPeer.avatar_initials },
                        "video",
                        active.id,
                      )
                    }
                  >
                    <Video className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Pin conversation"
                    onClick={async () => {
                      await setMemberFlags(active.id, userId, {
                        pinned: !active.membership.pinned,
                      });
                      void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
                    }}
                  >
                    <Pin
                      className={cn("size-4", active.membership.pinned && "text-brand")}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Mute conversation"
                    onClick={async () => {
                      await setMemberFlags(active.id, userId, { muted: !active.membership.muted });
                      void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
                    }}
                  >
                    <BellOff
                      className={cn("size-4", active.membership.muted && "text-brand")}
                    />
                  </Button>
                  {active.kind !== "dm" && (
                    <AddMembersDialog
                      conversation={active}
                      staff={staffQuery.data ?? []}
                      onDone={() =>
                        void queryClient.invalidateQueries({ queryKey: ["conversations", userId] })
                      }
                    />
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 px-4 py-3">
                {messagesQuery.isLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-2/3" />
                    ))}
                  </div>
                ) : (messagesQuery.data ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No messages yet — say hello.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(messagesQuery.data ?? []).map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        mine={message.sender_id === userId}
                        author={message.sender_id ? staffById.get(message.sender_id) : undefined}
                      />
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )}
              </ScrollArea>

              <Separator />
              <form
                className="flex items-end gap-2 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  sendMutation.mutate({ body: draft.trim() });
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Attach file"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Paperclip className="size-4" />
                  )}
                </Button>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${active.name}`}
                  className="h-10"
                />
                <Button type="submit" disabled={sendMutation.isPending || !draft.trim()}>
                  <Send className="size-4" />
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  mine,
  author,
}: {
  message: MessageRecord;
  mine: boolean;
  author?: StaffProfile | undefined;
}) {
  const [url, setUrl] = useState<string | null>(null);

  if (message.kind === "call") {
    return (
      <div className="flex justify-center">
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground">
          {message.call_missed ? (
            <PhoneMissed className="size-3.5 text-destructive" />
          ) : (
            <Phone className="size-3.5 text-brand" />
          )}
          {message.call_missed ? "Missed call" : `Call · ${message.call_duration ?? "—"}`}
          <span>· {formatTime(message.created_at)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="bg-muted text-[0.65rem] font-semibold text-foreground">
          {author?.avatar_initials ?? "??"}
        </AvatarFallback>
      </Avatar>
      <div className={cn("max-w-[75%] space-y-1", mine && "items-end text-right")}>
        <p className="text-[0.7rem] text-muted-foreground">
          {mine ? "You" : (author?.name ?? "Teammate")} · {formatTime(message.created_at)}
        </p>
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            mine
              ? "bg-brand text-brand-foreground"
              : "border border-border bg-surface/60 text-foreground",
          )}
        >
          {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
          {message.attachment_path && (
            <button
              type="button"
              className="mt-1.5 flex items-center gap-2 rounded-md border border-border/60 bg-card/70 px-2 py-1.5 text-left text-xs text-foreground"
              onClick={async () => {
                try {
                  const signed = url ?? (await signedAttachmentUrl(message.attachment_path!));
                  setUrl(signed);
                  window.open(signed, "_blank", "noopener");
                } catch {
                  toast.error("Could not open that file.");
                }
              }}
            >
              <FileText className="size-3.5 text-brand" />
              <span className="truncate">{message.attachment_name}</span>
              <span className="text-muted-foreground">
                {Math.max(1, Math.round((message.attachment_size ?? 0) / 1024))} KB
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NewConversationDialog({
  staff,
  userId,
  onCreated,
}: {
  staff: StaffProfile[];
  userId: string;
  onCreated: (id: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"dm" | "group" | "channel">("dm");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "dm") {
        const target = selected[0];
        if (!target) return;
        const id = await ensureDirectConversation(userId, target);
        await onCreated(id);
      } else {
        if (!name.trim()) {
          toast.error("Give the group a name.");
          return;
        }
        const id = await createGroupConversation({
          userId,
          name: mode === "channel" ? `#${name.trim().replace(/^#/, "")}` : name.trim(),
          kind: mode,
          memberIds: selected,
        });
        await onCreated(id);
      }
      setOpen(false);
      setName("");
      setSelected([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the conversation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> New
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
          <DialogDescription>
            Message a teammate directly, or create a team group or company channel.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dm">Direct</TabsTrigger>
            <TabsTrigger value="group">Group</TabsTrigger>
            <TabsTrigger value="channel">Channel</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode !== "dm" && (
          <div className="space-y-1.5">
            <Label htmlFor="conv-name">{mode === "channel" ? "Channel name" : "Group name"}</Label>
            <Input
              id="conv-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === "channel" ? "company-announcements" : "QC Pod A"}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>{mode === "dm" ? "Teammate" : "Members"}</Label>
          <ScrollArea className="h-56 rounded-md border border-border">
            <ul className="divide-y divide-border">
              {staff.map((person) => {
                const checked = selected.includes(person.id);
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent"
                      onClick={() =>
                        setSelected((prev) =>
                          mode === "dm"
                            ? [person.id]
                            : checked
                              ? prev.filter((id) => id !== person.id)
                              : [...prev, person.id],
                        )
                      }
                    >
                      {mode === "dm" ? (
                        <span
                          className={cn(
                            "size-3 rounded-full border border-border",
                            checked && "border-brand bg-brand",
                          )}
                        />
                      ) : (
                        <Checkbox checked={checked} />
                      )}
                      <Avatar className="size-7">
                        <AvatarFallback className="bg-muted text-[0.65rem]">
                          {person.avatar_initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground">{person.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {person.department}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
          {mode === "channel" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelected(staff.map((s) => s.id))}
              className="gap-1.5"
            >
              <Users className="size-3.5" /> Add everyone
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => void submit()}
            disabled={busy || (mode === "dm" ? selected.length === 0 : !name.trim())}
          >
            {mode === "dm" ? "Open chat" : mode === "channel" ? "Create channel" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMembersDialog({
  conversation,
  staff,
  onDone,
}: {
  conversation: ConversationView;
  staff: StaffProfile[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const memberIds = new Set(conversation.members.map((m) => m.id));
  const candidates = staff.filter((s) => !memberIds.has(s.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Add members">
          <Hash className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
          <DialogDescription>{conversation.name}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-56 rounded-md border border-border">
          <ul className="divide-y divide-border">
            {candidates.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">Everyone is already in here.</li>
            )}
            {candidates.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent"
                  onClick={() =>
                    setSelected((prev) =>
                      prev.includes(person.id)
                        ? prev.filter((id) => id !== person.id)
                        : [...prev, person.id],
                    )
                  }
                >
                  <Checkbox checked={selected.includes(person.id)} />
                  <span className="text-sm text-foreground">{person.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{person.department}</span>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <DialogFooter>
          <Button
            disabled={selected.length === 0}
            onClick={async () => {
              try {
                await addMembers(conversation.id, selected);
                setSelected([]);
                setOpen(false);
                onDone();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not add members.");
              }
            }}
          >
            Add {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
