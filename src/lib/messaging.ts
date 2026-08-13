import { supabase } from "@/integrations/supabase/client";

export type ConversationKind = "dm" | "group" | "channel";

export interface StaffProfile {
  id: string;
  name: string;
  email?: string;
  department: string;
  title: string;
  team: string;
  avatar_initials: string;
  avatar_url: string | null;
  presence: string;
}

export interface ConversationRecord {
  id: string;
  kind: ConversationKind;
  name: string;
  topic: string | null;
  avatar_initials: string;
  created_by: string | null;
  last_message_at: string;
  last_message_preview: string;
}

export interface MembershipRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  member_role: string;
  pinned: boolean;
  muted: boolean;
  last_read_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  kind: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  call_direction: string | null;
  call_duration: string | null;
  call_missed: boolean | null;
  created_at: string;
}

export interface ConversationView extends ConversationRecord {
  membership: MembershipRecord;
  members: StaffProfile[];
  unread: number;
}

export async function fetchStaff(): Promise<StaffProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,department,title,team,avatar_initials,avatar_url,presence")
    .order("name");
  if (error) throw error;
  return (data ?? []) as StaffProfile[];
}

export async function fetchConversations(userId: string): Promise<ConversationView[]> {
  const { data: memberships, error: memberErr } = await supabase
    .from("conversation_members")
    .select("*")
    .eq("user_id", userId);
  if (memberErr) throw memberErr;
  const mine = (memberships ?? []) as MembershipRecord[];
  if (mine.length === 0) return [];

  const ids = mine.map((m) => m.conversation_id);

  const [{ data: convos, error: convErr }, { data: allMembers }, { data: unreadRows }] =
    await Promise.all([
      supabase.from("conversations").select("*").in("id", ids).order("last_message_at", { ascending: false }),
      supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id", ids),
      supabase.from("messages").select("id,conversation_id,created_at,sender_id").in("conversation_id", ids),
    ]);
  if (convErr) throw convErr;

  const staff = await fetchStaff();
  const staffById = new Map(staff.map((s) => [s.id, s] as const));

  return ((convos ?? []) as ConversationRecord[]).map((conversation) => {
    const membership = mine.find((m) => m.conversation_id === conversation.id)!;
    const memberIds = (allMembers ?? [])
      .filter((m) => m.conversation_id === conversation.id)
      .map((m) => m.user_id as string);
    const unread = (unreadRows ?? []).filter(
      (m) =>
        m.conversation_id === conversation.id &&
        m.sender_id !== userId &&
        new Date(m.created_at as string) > new Date(membership.last_read_at),
    ).length;

    const others = memberIds
      .filter((id) => id !== userId)
      .map((id) => staffById.get(id))
      .filter(Boolean) as StaffProfile[];
    const displayName =
      conversation.kind === "dm"
        ? (others[0]?.name ?? (conversation.name || "Direct message"))
        : conversation.name;

    return {
      ...conversation,
      name: displayName,
      avatar_initials:
        conversation.kind === "dm"
          ? (others[0]?.avatar_initials ?? conversation.avatar_initials)
          : conversation.avatar_initials,
      membership,
      members: memberIds.map((id) => staffById.get(id)).filter(Boolean) as StaffProfile[],
      unread,
    };
  });
}

export async function fetchMessages(conversationId: string): Promise<MessageRecord[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as MessageRecord[];
}

export async function ensureDirectConversation(userId: string, otherId: string): Promise<string> {
  const { data: mine } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);
  const myIds = (mine ?? []).map((m) => m.conversation_id as string);

  if (myIds.length > 0) {
    const { data: shared } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherId)
      .in("conversation_id", myIds);
    const sharedIds = (shared ?? []).map((m) => m.conversation_id as string);
    if (sharedIds.length > 0) {
      const { data: dms } = await supabase
        .from("conversations")
        .select("id")
        .in("id", sharedIds)
        .eq("kind", "dm");
      const existing = (dms ?? [])[0]?.id as string | undefined;
      if (existing) return existing;
    }
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ kind: "dm", name: "", created_by: userId, avatar_initials: "DM" })
    .select("id")
    .single();
  if (error) throw error;

  const conversationId = created.id as string;
  // Insert my own membership first — row-level rules only let existing members
  // (or the creator) add other people.
  const { error: memberErr } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: conversationId, user_id: userId, member_role: "owner" });
  if (memberErr) throw memberErr;
  const { error: otherErr } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: conversationId, user_id: otherId, member_role: "member" });
  if (otherErr) throw otherErr;
  return conversationId;
}

export async function createGroupConversation(input: {
  userId: string;
  name: string;
  kind: Exclude<ConversationKind, "dm">;
  memberIds: string[];
  topic?: string;
}): Promise<string> {
  const initials = input.name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || "GR";

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      kind: input.kind,
      name: input.name,
      topic: input.topic ?? null,
      avatar_initials: input.kind === "channel" ? "#" : initials,
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (error) throw error;

  const conversationId = data.id as string;
  const others = Array.from(new Set(input.memberIds)).filter((id) => id !== input.userId);

  // Own membership first, then everyone else (row-level rules require membership).
  const { error: ownerErr } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: conversationId, user_id: input.userId, member_role: "owner" });
  if (ownerErr) throw ownerErr;

  if (others.length > 0) {
    const { error: memberErr } = await supabase
      .from("conversation_members")
      .insert(others.map((id) => ({ conversation_id: conversationId, user_id: id })));
    if (memberErr) throw memberErr;
  }
  return conversationId;
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  body: string;
  kind?: string;
  attachment?: { path: string; name: string; mime: string; size: number };
  call?: { direction: string; duration: string; missed?: boolean };
}) {
  const payload = {
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    body: input.body,
    kind: input.kind ?? (input.attachment ? "file" : input.call ? "call" : "text"),
    attachment_path: input.attachment?.path ?? null,
    attachment_name: input.attachment?.name ?? null,
    attachment_mime: input.attachment?.mime ?? null,
    attachment_size: input.attachment?.size ?? null,
    call_direction: input.call?.direction ?? null,
    call_duration: input.call?.duration ?? null,
    call_missed: input.call ? (input.call.missed ?? false) : null,
  };

  const { data, error } = await supabase.from("messages").insert(payload).select("*").single();
  if (error) throw error;

  const preview = input.attachment
    ? `📎 ${input.attachment.name}`
    : input.call
      ? `📞 ${input.call.missed ? "Missed call" : `Call · ${input.call.duration}`}`
      : input.body.slice(0, 120);

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString(), last_message_preview: preview })
    .eq("id", input.conversationId);

  return data as MessageRecord;
}

export async function uploadAttachment(file: File, userId: string) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("attachments").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return { path, name: file.name, mime: file.type || "application/octet-stream", size: file.size };
}

export async function signedAttachmentUrl(path: string) {
  const { data, error } = await supabase.storage.from("attachments").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function markConversationRead(conversationId: string, userId: string) {
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function setMemberFlags(
  conversationId: string,
  userId: string,
  flags: { pinned?: boolean; muted?: boolean },
) {
  await supabase
    .from("conversation_members")
    .update(flags)
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function addMembers(conversationId: string, userIds: string[]) {
  if (userIds.length === 0) return;
  await supabase
    .from("conversation_members")
    .upsert(
      userIds.map((id) => ({ conversation_id: conversationId, user_id: id })),
      { onConflict: "conversation_id,user_id" },
    );
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatRelative(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return formatTime(iso);
  const yesterday = new Date(today.getTime() - 86400000);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
