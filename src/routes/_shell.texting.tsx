import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  MessageCircle,
  Plus,
  Search,
  Send,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_shell/texting")({
  head: () => ({
    meta: [
      { title: "Texting — Policy Bear CRM" },
      {
        name: "description",
        content: "Two-way customer SMS inbox with live delivery status and templates.",
      },
      { property: "og:title", content: "Texting — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Two-way customer SMS inbox with live delivery status and templates.",
      },
    ],
  }),
  component: TextingPage,
});

type Thread = Database["public"]["Tables"]["sms_threads"]["Row"];
type Message = Database["public"]["Tables"]["sms_messages"]["Row"];
type Contact = Database["public"]["Tables"]["contacts"]["Row"];

const TEMPLATES = [
  { label: "Payment reminder", body: "Hi! This is a friendly reminder that your policy payment is due soon. Reply if you have any questions." },
  { label: "Follow up", body: "Hi there — just checking in to see if you had any questions about your policy. We're here to help!" },
  { label: "Thank you", body: "Thank you for choosing Policy Bear! Let us know if there's anything else we can do for you." },
  { label: "Documents needed", body: "We're missing a document to finish processing your policy. Could you send it over when you get a chance?" },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "delivered") return <CheckCircle2 className="size-3.5 text-success" />;
  if (status === "sent") return <Clock className="size-3.5 text-muted-foreground" />;
  if (status === "failed") return <XCircle className="size-3.5 text-destructive" />;
  return <CircleDashed className="size-3.5 text-muted-foreground" />;
}

function TextingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newContactId, setNewContactId] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadsQuery = useQuery({
    queryKey: ["sms_threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_threads")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Thread[];
    },
  });

  const contactsQuery = useQuery({
    queryKey: ["contacts", "for-texting"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("full_name", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
    enabled: newOpen,
  });

  const threads = threadsQuery.data ?? [];

  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (mineOnly && t.assigned_to !== user?.id) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!t.contact_name.toLowerCase().includes(q) && !t.contact_phone.includes(q)) return false;
      }
      return true;
    });
  }, [threads, statusFilter, mineOnly, search, user?.id]);

  useEffect(() => {
    if (!activeThreadId && filteredThreads.length > 0) {
      setActiveThreadId(filteredThreads[0]?.id ?? null);
    }
  }, [filteredThreads, activeThreadId]);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const messagesQuery = useQuery({
    queryKey: ["sms_messages", activeThreadId],
    queryFn: async () => {
      if (!activeThreadId) return [] as Message[];
      const { data, error } = await supabase
        .from("sms_messages")
        .select("*")
        .eq("thread_id", activeThreadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    enabled: !!activeThreadId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data]);

  // Mark thread as read when opened
  useEffect(() => {
    if (!activeThread || activeThread.unread_count === 0) return;
    void supabase.from("sms_threads").update({ unread_count: 0 }).eq("id", activeThread.id).then(() => {
      queryClient.invalidateQueries({ queryKey: ["sms_threads"] });
    });
  }, [activeThread?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const channel = supabase
      .channel("texting-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sms_messages"] });
        queryClient.invalidateQueries({ queryKey: ["sms_threads"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_threads" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sms_threads"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const sendMutation = useMutation({
    mutationFn: async ({ threadId, body }: { threadId: string; body: string }) => {
      if (!user) throw new Error("Not signed in");
      const { error: msgError } = await supabase.from("sms_messages").insert({
        thread_id: threadId,
        direction: "outbound",
        body,
        status: "queued",
        sent_by: user.id,
      });
      if (msgError) throw msgError;
      const { error: threadError } = await supabase
        .from("sms_threads")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: body.slice(0, 140),
        })
        .eq("id", threadId);
      if (threadError) throw threadError;
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["sms_messages"] });
      queryClient.invalidateQueries({ queryKey: ["sms_threads"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to send text"),
  });

  const assignMutation = useMutation({
    mutationFn: async (threadId: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("sms_threads").update({ assigned_to: user.id }).eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thread assigned to you");
      queryClient.invalidateQueries({ queryKey: ["sms_threads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ threadId, status }: { threadId: string; status: string }) => {
      const { error } = await supabase.from("sms_threads").update({ status }).eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms_threads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const newThreadMutation = useMutation({
    mutationFn: async () => {
      const name = newContactId
        ? contactsQuery.data?.find((c) => c.id === newContactId)?.full_name ?? newName
        : newName;
      const phone = newContactId
        ? contactsQuery.data?.find((c) => c.id === newContactId)?.phone ?? newPhone
        : newPhone;
      if (!name.trim() || !phone.trim()) throw new Error("Name and phone are required");

      const { data: existing } = await supabase
        .from("sms_threads")
        .select("*")
        .eq("contact_phone", phone.trim())
        .maybeSingle();
      if (existing) return existing as Thread;

      const { data, error } = await supabase
        .from("sms_threads")
        .insert({
          contact_id: newContactId || null,
          contact_name: name.trim(),
          contact_phone: phone.trim(),
          status: "open",
          last_message_at: new Date().toISOString(),
          last_message_preview: "",
          unread_count: 0,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Thread;
    },
    onSuccess: (thread) => {
      setNewOpen(false);
      setNewName("");
      setNewPhone("");
      setNewContactId("");
      setActiveThreadId(thread.id);
      queryClient.invalidateQueries({ queryKey: ["sms_threads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const today = new Date().toDateString();
  const stats = useMemo(() => {
    const open = threads.filter((t) => t.status === "open").length;
    const unread = threads.reduce((sum, t) => sum + (t.unread_count ?? 0), 0);
    return { open, unread };
  }, [threads]);

  const sentTodayQuery = useQuery({
    queryKey: ["sms_messages_today"],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("sms_messages")
        .select("id, status, direction, created_at")
        .eq("direction", "outbound")
        .gte("created_at", start.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const sentToday = (sentTodayQuery.data ?? []).length;
  const failedToday = (sentTodayQuery.data ?? []).filter((m) => m.status === "failed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Texting"
        description="Two-way SMS conversations with customers."
        actions={
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> New conversation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New conversation</DialogTitle>
                <DialogDescription>Pick an existing contact or type a name and phone number.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Existing contact</Label>
                  <Select value={newContactId} onValueChange={(v) => setNewContactId(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a contact (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {(contactsQuery.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name} {c.phone ? `— ${c.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!newContactId && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-name">Name</Label>
                      <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jane Doe" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-phone">Phone</Label>
                      <Input id="new-phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 555 123 4567" />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => newThreadMutation.mutate()} disabled={newThreadMutation.isPending}>
                  Start conversation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open threads" value={stats.open} icon={<MessageCircle className="size-4" />} tone="brand" />
        <StatCard label="Unread" value={stats.unread} icon={<CircleDashed className="size-4" />} tone="warning" />
        <StatCard label="Sent today" value={sentToday} icon={<Send className="size-4" />} tone="success" />
        <StatCard label="Failed" value={failedToday} icon={<XCircle className="size-4" />} tone="danger" />
      </div>

      <p className="text-xs text-muted-foreground">
        Outbound texts are dispatched by the SMS provider connected on the{" "}
        <a href="/admin/integrations" className="underline underline-offset-2">
          Integrations
        </a>{" "}
        page.
      </p>

      <Card className="grid gap-0 overflow-hidden p-0 shadow-card lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col border-b border-border lg:border-r lg:border-b-0">
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or phone…"
                className="h-8 pl-7 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant={mineOnly ? "default" : "outline"}
                className="h-8 shrink-0 text-xs"
                onClick={() => setMineOnly((v) => !v)}
              >
                Mine
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[560px]">
            {threadsQuery.isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No conversations found.</div>
            ) : (
              <div className="divide-y divide-border">
                {filteredThreads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    className={cn(
                      "flex w-full items-start gap-2 p-3 text-left transition-colors hover:bg-muted/60",
                      activeThreadId === t.id && "bg-muted",
                    )}
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="text-xs">
                        {t.contact_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{t.contact_name}</p>
                        <span className="shrink-0 text-[0.65rem] text-muted-foreground">{formatTime(t.last_message_at)}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{t.last_message_preview || t.contact_phone}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge variant={t.status === "open" ? "secondary" : "outline"} className="text-[0.6rem]">
                          {t.status}
                        </Badge>
                        {t.unread_count > 0 && (
                          <Badge className="bg-brand text-[0.6rem] text-brand-foreground">{t.unread_count}</Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex flex-col">
          {!activeThread ? (
            <div className="flex flex-1 items-center justify-center p-10 text-sm text-muted-foreground">
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-border p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeThread.contact_name}</p>
                  <p className="text-xs text-muted-foreground">{activeThread.contact_phone}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => assignMutation.mutate(activeThread.id)}>
                    <UserCheck className="size-3.5" /> Assign to me
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      toggleStatusMutation.mutate({
                        threadId: activeThread.id,
                        status: activeThread.status === "open" ? "closed" : "open",
                      })
                    }
                  >
                    {activeThread.status === "open" ? "Mark closed" : "Reopen"}
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[420px] flex-1 p-3">
                {messagesQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-2/3" />
                    ))}
                  </div>
                ) : (messagesQuery.data ?? []).length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No messages yet. Say hello!</div>
                ) : (
                  <div className="space-y-2">
                    {(messagesQuery.data ?? []).map((m) => (
                      <div key={m.id} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm",
                            m.direction === "outbound" ? "bg-brand text-brand-foreground" : "bg-muted text-foreground",
                          )}
                        >
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <div
                            className={cn(
                              "mt-1 flex items-center gap-1 text-[0.65rem]",
                              m.direction === "outbound" ? "text-brand-foreground/80" : "text-muted-foreground",
                            )}
                          >
                            <span>{formatTime(m.created_at)}</span>
                            {m.direction === "outbound" && <StatusIcon status={m.status} />}
                            {m.status === "failed" && m.error && <span className="truncate">· {m.error}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )}
              </ScrollArea>
              <div className="space-y-2 border-t border-border p-3">
                <div className="flex items-center gap-2">
                  <Select onValueChange={(v) => setDraft(v)}>
                    <SelectTrigger className="h-8 w-48 text-xs">
                      <SelectValue placeholder="Quick templates" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATES.map((t) => (
                        <SelectItem key={t.label} value={t.body}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message…"
                    rows={2}
                    className="resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (draft.trim() && activeThread) {
                          sendMutation.mutate({ threadId: activeThread.id, body: draft.trim() });
                        }
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    disabled={!draft.trim() || sendMutation.isPending}
                    onClick={() => activeThread && sendMutation.mutate({ threadId: activeThread.id, body: draft.trim() })}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
