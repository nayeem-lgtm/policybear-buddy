/**
 * Server functions for Do-Not-Call compliance: the DNC list, bulk import,
 * releases and the searchable compliance audit log.
 *
 * Thin wrapper module — imports, types and server-function declarations only.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  dncAddSchema,
  dncBulkSchema,
  dncListSchema,
  dncReleaseSchema,
} from "@/lib/dnc-shared";
import { normalizeE164 } from "@/lib/phone";

/** DNC list + audit log + headline compliance numbers in one round-trip. */
export const getDncCenter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dncListSchema.parse(data ?? {}))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const since = new Date(Date.now() - data.days * 86400000).toISOString();

    let list = supabase.from("dnc_entries").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.status === "active") list = list.eq("active", true);
    if (data.status === "released") list = list.eq("active", false);
    if (data.scope !== "all") list = list.eq("scope", data.scope);
    if (data.search) {
      const digits = data.search.replace(/\D/g, "");
      list = digits
        ? list.ilike("phone_e164", `%${digits}%`)
        : list.ilike("contact_name", `%${data.search}%`);
    }

    let audit = supabase
      .from("dnc_events")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.action !== "all") audit = audit.eq("action", data.action);
    if (data.search) {
      const digits = data.search.replace(/\D/g, "");
      audit = digits ? audit.ilike("phone_e164", `%${digits}%`) : audit.ilike("actor_name", `%${data.search}%`);
    }

    const [entries, events, activeCount, blockedCount] = await Promise.all([
      list,
      audit,
      supabase.from("dnc_entries").select("id", { count: "exact", head: true }).eq("active", true),
      supabase
        .from("dnc_events")
        .select("id", { count: "exact", head: true })
        .eq("action", "dial_blocked")
        .gte("created_at", since),
    ]);

    if (entries.error) throw new Error(entries.error.message);

    return {
      entries: entries.data ?? [],
      events: events.data ?? [],
      totals: {
        active: activeCount.count ?? 0,
        blocked: blockedCount.count ?? 0,
        released: (entries.data ?? []).filter((e) => !e.active).length,
        addedWindow: (events.data ?? []).filter((e) => e.action === "added" || e.action === "imported").length,
      },
    };
  });

/** Add a single number to the Do-Not-Call list. */
export const addDncNumber = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dncAddSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { addToDnc } = await import("@/lib/dnc.server");
    const row = await addToDnc(
      context.supabase,
      {
        phone: data.phone,
        contactName: data.contactName ?? null,
        reason: data.reason,
        scope: data.scope,
        source: data.source,
        notes: data.notes ?? null,
      },
      { userId: context.userId },
    );
    return { entry: row };
  });

/** Paste-in bulk import of numbers (one per line / comma separated). */
export const importDncNumbers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dncBulkSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { addToDnc } = await import("@/lib/dnc.server");
    const raw = data.text
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let added = 0;
    const skipped: string[] = [];
    for (const value of raw.slice(0, 500)) {
      if (!normalizeE164(value)) {
        skipped.push(value);
        continue;
      }
      await addToDnc(
        context.supabase,
        { phone: value, reason: data.reason, scope: data.scope, source: "import", notes: null },
        { userId: context.userId, action: "imported" },
      );
      added += 1;
    }
    return { added, skipped };
  });

/** Release a number from the DNC list (kept in the audit trail forever). */
export const releaseDncNumber = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dncReleaseSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("dnc_entries")
      .update({ active: false, released_at: new Date().toISOString(), released_by: userId })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { logDncEvent, actorName } = await import("@/lib/dnc.server");
    await logDncEvent(supabase, {
      phone: row.phone_e164,
      action: "released",
      reason: data.reason ?? "Released by staff",
      source: "manual",
      actorId: userId,
      actorName: await actorName(supabase, userId),
      entryId: row.id,
    });
    return { entry: row };
  });

/** Live lookup used by the dialer before a number is dialled. */
export const checkDncNumber = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ phone: z.string().min(3).max(24) }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { findDnc } = await import("@/lib/dnc.server");
    const hit = await findDnc(context.supabase, data.phone);
    return { blocked: Boolean(hit), entry: hit };
  });
