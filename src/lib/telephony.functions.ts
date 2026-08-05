/**
 * Server functions for the telephony sync engine, live call monitoring and
 * CallTools vs CallGrid source attribution.
 *
 * Thin wrapper module: only imports, types and server-function declarations.
 */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertAdminAccess,
  assertOpsAccess,
  callFilterSchema,
  overrideSchema,
  PROVIDERS,
} from "@/lib/telephony-shared";
import { normalizeE164 } from "@/lib/phone";

/** Sync health per provider plus what each provider allows us to do today. */
export const getTelephonyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOpsAccess(context);
    const { capabilitiesFor } = await import("@/lib/telephony.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: syncRows }, { count: callCount }, { count: journeyCount }] = await Promise.all([
      supabaseAdmin.from("sync_state").select("*").order("provider"),
      supabaseAdmin.from("telephony_calls").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("lead_journeys").select("id", { count: "exact", head: true }),
    ]);

    return {
      sync: syncRows ?? [],
      totals: { calls: callCount ?? 0, journeys: journeyCount ?? 0 },
      keys: {
        calltools: Boolean(process.env["CALLTOOLS_API_KEY"]),
        callgrid: Boolean(process.env["CALLGRID_API_KEY"]),
      },
      capabilities: {
        calltools: capabilitiesFor("calltools"),
        callgrid: capabilitiesFor("callgrid"),
      },
      attributionWindowDays: Number(process.env["ATTRIBUTION_WINDOW_DAYS"]) || 30,
    };
  });

/** Manual sync / backfill trigger for operations staff. */
export const runTelephonySync = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const parsed = (data ?? {}) as { maxItems?: number; providers?: string[] };
    return {
      maxItems: Math.min(Math.max(Number(parsed.maxItems) || 200, 20), 2000),
      providers: (parsed.providers ?? [...PROVIDERS]).filter((p): p is "calltools" | "callgrid" =>
        (PROVIDERS as readonly string[]).includes(p),
      ),
    };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertOpsAccess(context);
    const { runSync } = await import("@/lib/telephony.server");
    return runSync({ providers: data.providers, maxItems: data.maxItems });
  });

/** Synced calls with dropdown-driven filters, newest first. */
export const listTelephonyCalls = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => callFilterSchema.parse(data ?? {}))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertOpsAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    let query = supabaseAdmin
      .from("telephony_calls")
      .select(
        "id, provider, provider_call_id, agent_name, direction, from_number, to_number, lead_phone_e164, status, disposition, campaign, buyer, publisher, talk_seconds, revenue, payout, recording_url, started_at",
      )
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(data.limit);

    if (data.provider !== "all") query = query.eq("provider", data.provider);
    if (data.agent !== "all") query = query.eq("agent_name", data.agent);
    if (data.campaign !== "all") query = query.eq("campaign", data.campaign);
    if (data.search) {
      const digits = data.search.replace(/\D/g, "");
      if (digits) query = query.or(`from_number.ilike.%${digits}%,to_number.ilike.%${digits}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const { data: options } = await supabaseAdmin
      .from("telephony_calls")
      .select("agent_name, campaign")
      .gte("started_at", since)
      .limit(2000);

    return {
      calls: rows ?? [],
      agents: [...new Set((options ?? []).map((o) => o.agent_name).filter(Boolean))].sort() as string[],
      campaigns: [...new Set((options ?? []).map((o) => o.campaign).filter(Boolean))].sort() as string[],
    };
  });

/** Live floor view: calls in progress / just ended and today's per-agent activity. */
export const getLiveCallMonitor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOpsAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const { data: rows, error } = await supabaseAdmin
      .from("telephony_calls")
      .select(
        "id, provider, agent_name, direction, from_number, to_number, status, disposition, campaign, talk_seconds, recording_url, started_at, ended_at",
      )
      .gte("started_at", dayStart.toISOString())
      .order("started_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const calls = rows ?? [];
    const byAgent = new Map<string, {
      agentName: string;
      provider: "calltools" | "callgrid";
      calls: number;
      connected: number;
      talkSeconds: number;
      lastCallAt: string | null;
      lastDisposition: string | null;
      onLiveCall: boolean;
    }>();

    const liveCutoff = Date.now() - 5 * 60000;
    for (const c of calls) {
      const name = c.agent_name ?? "Unassigned";
      const entry =
        byAgent.get(name) ??
        {
          agentName: name,
          provider: c.provider as "calltools" | "callgrid",
          calls: 0,
          connected: 0,
          talkSeconds: 0,
          lastCallAt: null as string | null,
          lastDisposition: null as string | null,
          onLiveCall: false,
        };
      entry.calls += 1;
      if ((c.talk_seconds ?? 0) >= 30) entry.connected += 1;
      entry.talkSeconds += c.talk_seconds ?? 0;
      if (!entry.lastCallAt && c.started_at) {
        entry.lastCallAt = c.started_at;
        entry.lastDisposition = c.disposition ?? c.status ?? null;
      }
      if (!c.ended_at && c.started_at && new Date(c.started_at).getTime() > liveCutoff) {
        entry.onLiveCall = true;
      }
      byAgent.set(name, entry);
    }

    const { data: presence } = await supabaseAdmin
      .from("profiles")
      .select("name, presence, department, team")
      .order("name");

    return {
      recent: calls.slice(0, 40),
      agents: [...byAgent.values()].sort((a, b) => b.calls - a.calls),
      presence: presence ?? [],
      totals: {
        calls: calls.length,
        talkSeconds: calls.reduce((s, c) => s + (c.talk_seconds ?? 0), 0),
        live: calls.filter((c) => !c.ended_at && c.started_at && new Date(c.started_at).getTime() > liveCutoff)
          .length,
      },
    };
  });

/** Scrubbed attribution: callbacks and revenue split between the two systems. */
export const getAttributionReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => callFilterSchema.parse(data ?? {}))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertOpsAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - data.days * 86400000).toISOString();

    const { data: journeys, error } = await supabaseAdmin
      .from("lead_journeys")
      .select(
        "id, phone_e164, first_touch_provider, first_touch_at, last_touch_provider, last_touch_at, inbound_callgrid_count, outbound_calltools_count, callback_via_calltools, total_attempts, total_talk_seconds, days_to_contact, attributed_provider",
      )
      .gte("first_touch_at", since)
      .order("last_touch_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const rows = journeys ?? [];
    const { data: sales } = await supabaseAdmin
      .from("contacts")
      .select("phone, status, full_name, created_at")
      .gte("created_at", since)
      .limit(2000);

    const soldPhones = new Set(
      (sales ?? [])
        .filter((s) => (s.status ?? "").toLowerCase().includes("sold") || (s.status ?? "").toLowerCase() === "won")
        .map((s) => normalizeE164(s.phone))
        .filter((p): p is string => Boolean(p)),
    );

    const bucket = (provider: string | null) => (provider === "calltools" ? "calltools" : "callgrid");
    const summary = {
      calltools: { leads: 0, callbacks: 0, sales: 0, attempts: 0, talkSeconds: 0 },
      callgrid: { leads: 0, callbacks: 0, sales: 0, attempts: 0, talkSeconds: 0 },
    };
    for (const j of rows) {
      const key = bucket(j.attributed_provider) as "calltools" | "callgrid";
      summary[key].leads += 1;
      summary[key].attempts += j.total_attempts ?? 0;
      summary[key].talkSeconds += j.total_talk_seconds ?? 0;
      if (j.callback_via_calltools) summary[key].callbacks += 1;
      if (soldPhones.has(j.phone_e164)) summary[key].sales += 1;
    }

    return {
      summary,
      journeys: rows.map((j) => ({ ...j, sold: soldPhones.has(j.phone_e164) })),
      unmatchedSales: [...soldPhones].filter((p) => !rows.some((j) => j.phone_e164 === p)).length,
    };
  });

/** Manual source correction for a single number (admins only). */
export const setAttributionOverride = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => overrideSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context);
    const phone = normalizeE164(data.phone);
    if (!phone) throw new Error("Enter a valid phone number");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("attribution_overrides").upsert(
      {
        phone_e164: phone,
        provider: data.provider,
        reason: data.reason ?? null,
        created_by: context.userId,
      },
      { onConflict: "phone_e164" },
    );
    if (error) throw new Error(error.message);

    const { rebuildJourneys } = await import("@/lib/telephony.server");
    await rebuildJourneys([phone]);
    return { phone, provider: data.provider };
  });

/** Agent-facing actions the provider does not expose yet (dial, status, disposition). */
export const requestProviderAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as { provider?: string; action?: string; payload?: Record<string, unknown> };
    if (!d.provider || !d.action) throw new Error("provider and action are required");
    return { provider: d.provider as "calltools" | "callgrid", action: d.action, payload: d.payload ?? {} };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { capabilitiesFor, UnsupportedCapability } = await import("@/lib/telephony.server");
    const caps = capabilitiesFor(data.provider);
    const action = data.action as keyof typeof caps;
    if (!caps[action]) throw new UnsupportedCapability(data.provider, action);
    // Wired the day the provider enables the endpoint on this account.
    return { accepted: true, provider: data.provider, action: data.action };
  });
