/**
 * Auto-fill layer: turns synced telephony records into first-class CRM records.
 *
 * Every phone number that CallTools or CallGrid reports becomes a contact, and
 * every contact gets a texting thread, so the main system fills itself from the
 * connected providers without anybody typing a lead in by hand.
 *
 * Idempotent: keyed on contacts.phone and sms_threads.contact_phone unique
 * indexes, so re-running a sync updates instead of duplicating.
 */

import { formatPhone } from "@/lib/phone";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export interface AutofillResult {
  contacts: number;
  threads: number;
  journeysLinked: number;
}

/** Derives a human label for a lead we only know by number. */
function leadName(phone: string, state: string | null) {
  return state ? `Lead ${formatPhone(phone)} · ${state}` : `Lead ${formatPhone(phone)}`;
}

/**
 * Builds contacts + texting threads for the given phone numbers (or every
 * journey when none are supplied) and links journeys back to their contact.
 */
export async function autofillFromTelephony(phones?: string[]): Promise<AutofillResult> {
  const db = await admin();

  const journeyQuery = db
    .from("lead_journeys")
    .select(
      "id, phone_e164, contact_id, owner_id, attributed_provider, last_touch_provider, last_touch_at, total_attempts, total_talk_seconds",
    )
    .order("last_touch_at", { ascending: false })
    .limit(2000);
  const { data: journeys, error: journeyErr } = phones?.length
    ? await journeyQuery.in("phone_e164", phones)
    : await journeyQuery;
  if (journeyErr) throw new Error(journeyErr.message);
  if (!journeys || journeys.length === 0) return { contacts: 0, threads: 0, journeysLinked: 0 };

  const numbers = journeys.map((j) => j.phone_e164);

  // Newest call per number gives us state, agent owner and disposition context.
  const { data: calls } = await db
    .from("telephony_calls")
    .select("lead_phone_e164, state_code, agent_user_id, agent_name, provider, disposition, started_at, from_number")
    .in("lead_phone_e164", numbers)
    .order("started_at", { ascending: false })
    .limit(5000);

  const latest = new Map<
    string,
    { state: string | null; owner: string | null; provider: string; disposition: string | null; from: string | null }
  >();
  for (const call of calls ?? []) {
    const key = call.lead_phone_e164;
    if (!key || latest.has(key)) continue;
    latest.set(key, {
      state: call.state_code ?? null,
      owner: call.agent_user_id ?? null,
      provider: call.provider,
      disposition: call.disposition ?? null,
      from: call.from_number ?? null,
    });
  }

  const { data: existingContacts } = await db
    .from("contacts")
    .select("id, phone, full_name")
    .in("phone", numbers);
  const contactByPhone = new Map((existingContacts ?? []).map((c) => [c.phone as string, c] as const));

  const contactRows = journeys.map((j) => {
    const info = latest.get(j.phone_e164);
    const existing = contactByPhone.get(j.phone_e164);
    return {
      full_name: existing?.full_name ?? leadName(j.phone_e164, info?.state ?? null),
      phone: j.phone_e164,
      state: info?.state ?? null,
      source: j.attributed_provider ?? info?.provider ?? null,
      status: (info?.disposition ?? "new").toLowerCase().includes("sale") ? "customer" : "lead",
      owner_id: j.owner_id ?? info?.owner ?? null,
      external_ids: { journey_id: j.id, provider: info?.provider ?? null },
    };
  });

  const { data: upsertedContacts, error: contactErr } = await db
    .from("contacts")
    .upsert(contactRows, { onConflict: "phone" })
    .select("id, phone, full_name, owner_id");
  if (contactErr) throw new Error(contactErr.message);

  const contacts = upsertedContacts ?? [];
  const contactIdByPhone = new Map(contacts.map((c) => [c.phone as string, c] as const));

  // Link journeys to their contact so attribution screens can jump to the record.
  let journeysLinked = 0;
  for (const j of journeys) {
    const contact = contactIdByPhone.get(j.phone_e164);
    if (!contact || j.contact_id === contact.id) continue;
    await db.from("lead_journeys").update({ contact_id: contact.id }).eq("id", j.id);
    journeysLinked += 1;
  }

  // One texting thread per contact, seeded with provider context.
  const threadRows = journeys.map((j) => {
    const contact = contactIdByPhone.get(j.phone_e164);
    const info = latest.get(j.phone_e164);
    return {
      contact_id: contact?.id ?? null,
      contact_name: contact?.full_name ?? leadName(j.phone_e164, info?.state ?? null),
      contact_phone: j.phone_e164,
      from_number: info?.from ?? null,
      provider: info?.provider ?? null,
      assigned_to: contact?.owner_id ?? info?.owner ?? null,
      last_message_at: j.last_touch_at ?? new Date().toISOString(),
      last_message_preview: info?.disposition
        ? `Last call: ${info.disposition}`
        : `${j.total_attempts} call attempt${j.total_attempts === 1 ? "" : "s"} synced`,
      status: "open",
    };
  });

  const { error: threadErr } = await db
    .from("sms_threads")
    .upsert(threadRows, { onConflict: "contact_phone" });
  if (threadErr) throw new Error(threadErr.message);

  return { contacts: contacts.length, threads: threadRows.length, journeysLinked };
}
