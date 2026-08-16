/**
 * Server-only DNC helpers shared by the dialer and the DNC screen.
 * Every function takes the caller's RLS-scoped Supabase client.
 */

import { normalizeE164 } from "@/lib/phone";

type Client = {
  from: (table: string) => any;
};

export interface DncHit {
  id: string;
  phone_e164: string;
  reason: string;
  scope: string;
  contact_name: string | null;
}

/** Return the active DNC record for a number, or null. */
export async function findDnc(supabase: Client, phoneInput: string): Promise<DncHit | null> {
  const phone = normalizeE164(phoneInput);
  if (!phone) return null;
  const { data } = await supabase
    .from("dnc_entries")
    .select("id, phone_e164, reason, scope, contact_name")
    .eq("phone_e164", phone)
    .eq("active", true)
    .maybeSingle();
  return (data as DncHit | null) ?? null;
}

/** Append a compliance audit event. Never throws — logging must not break a call. */
export async function logDncEvent(
  supabase: Client,
  event: {
    phone: string;
    action: string;
    reason?: string | null;
    source?: string;
    detail?: Record<string, unknown>;
    actorId?: string | null;
    actorName?: string | null;
    entryId?: string | null;
  },
): Promise<void> {
  const phone = normalizeE164(event.phone) ?? event.phone;
  try {
    await supabase.from("dnc_events").insert({
      phone_e164: phone,
      action: event.action,
      reason: event.reason ?? null,
      source: event.source ?? "manual",
      detail: event.detail ?? {},
      actor_id: event.actorId ?? null,
      actor_name: event.actorName ?? null,
      entry_id: event.entryId ?? null,
    });
  } catch {
    /* audit logging is best-effort */
  }
}

/** Display name for the audit trail. */
export async function actorName(supabase: Client, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("name").eq("id", userId).maybeSingle();
  return (data?.name as string | undefined) ?? null;
}

/**
 * Guard used before any dial. Logs a `dial_blocked` audit event and throws
 * when the number is on the Do-Not-Call list.
 */
export async function assertDialable(
  supabase: Client,
  phoneInput: string,
  ctx: { userId: string; source: string; detail?: Record<string, unknown> },
): Promise<void> {
  const hit = await findDnc(supabase, phoneInput);
  if (!hit) return;
  await logDncEvent(supabase, {
    phone: hit.phone_e164,
    action: "dial_blocked",
    reason: hit.reason,
    source: ctx.source,
    detail: { scope: hit.scope, ...(ctx.detail ?? {}) },
    actorId: ctx.userId,
    actorName: await actorName(supabase, ctx.userId),
    entryId: hit.id,
  });
  throw new Error(
    `Blocked: ${hit.phone_e164} is on the Do-Not-Call list (${hit.reason}). This attempt has been logged.`,
  );
}

/** Add (or re-activate) a number on the DNC list and audit it. */
export async function addToDnc(
  supabase: Client,
  input: {
    phone: string;
    contactName?: string | null;
    reason: string;
    scope: string;
    source: string;
    notes?: string | null;
  },
  ctx: { userId: string; actorName?: string | null; action?: string },
) {
  const phone = normalizeE164(input.phone);
  if (!phone) throw new Error("Enter a valid phone number");

  const { data: row, error } = await supabase
    .from("dnc_entries")
    .upsert(
      {
        phone_e164: phone,
        contact_name: input.contactName ?? null,
        reason: input.reason,
        scope: input.scope,
        source: input.source,
        notes: input.notes ?? null,
        active: true,
        added_by: ctx.userId,
        released_at: null,
        released_by: null,
      },
      { onConflict: "phone_e164" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);

  await logDncEvent(supabase, {
    phone,
    action: ctx.action ?? "added",
    reason: input.reason,
    source: input.source,
    detail: { scope: input.scope, notes: input.notes ?? null },
    actorId: ctx.userId,
    actorName: ctx.actorName ?? (await actorName(supabase, ctx.userId)),
    entryId: row?.id ?? null,
  });

  return row;
}
