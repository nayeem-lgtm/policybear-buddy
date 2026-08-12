/**
 * Server functions for the CallTools agent desk and manager floor view.
 *
 * Thin wrapper module: imports, types and server-function declarations only —
 * every runtime helper lives in `@/lib/calltools.server`.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import {
  callControlSchema,
  callbackSchema,
  dialSchema,
  dispositionSchema,
  settingsSchema,
  setStatusSchema,
  smsSchema,
  upsertContactSchema,
} from "@/lib/calltools-shared";

/* ------------------------------------------------------------------ agent desk */

/** Everything the agent desk needs in one round trip. */
export const getAgentDesk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getSettings, resolveAgentLink, fetchLiveCalls } = await import("@/lib/calltools.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [settings, link] = await Promise.all([getSettings(), resolveAgentLink(context.userId)]);

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [{ data: dispositions }, { data: calls }, { data: queue }] = await Promise.all([
      supabaseAdmin
        .from("telephony_dispositions")
        .select("provider_disposition_id, name, category, is_sale, is_callback")
        .eq("active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("telephony_calls")
        .select(
          "id, provider_call_id, direction, from_number, to_number, lead_phone_e164, status, disposition, campaign, talk_seconds, recording_url, started_at, ended_at, crm_originated, contact_id",
        )
        .eq("agent_user_id", context.userId)
        .gte("started_at", dayStart.toISOString())
        .order("started_at", { ascending: false })
        .limit(60),
      supabaseAdmin
        .from("telephony_queue_items")
        .select("id, kind, contact_name, phone_e164, scheduled_at, status, notes, campaign")
        .eq("assigned_user_id", context.userId)
        .in("status", ["Queued", "Scheduled", "Pending"])
        .order("scheduled_at")
        .limit(40),
    ]);

    let live: Awaited<ReturnType<typeof fetchLiveCalls>> = [];
    let liveError: string | null = null;
    if (link) {
      try {
        const all = await fetchLiveCalls();
        live = all.filter((c) => c.agentId === link.provider_agent_id);
      } catch (err) {
        liveError = err instanceof Error ? err.message : "CallTools did not answer";
      }
    }

    const todays = calls ?? [];
    return {
      linked: Boolean(link),
      providerAgentId: link?.provider_agent_id ?? null,
      providerAgentName: link?.provider_agent_name ?? null,
      providerStatus: link?.provider_status ?? null,
      webPhoneStatus: link?.web_phone_status ?? null,
      settings: {
        writesEnabled: settings.writes_enabled,
        dialEnabled: settings.dial_enabled,
        statusSyncEnabled: settings.status_sync_enabled,
        connectorConfigured: Boolean(settings.connector_button_id),
      },
      dispositions: dispositions ?? [],
      calls: todays,
      queue: queue ?? [],
      live,
      liveError,
      totals: {
        calls: todays.length,
        connected: todays.filter((c) => (c.talk_seconds ?? 0) >= 30).length,
        talkSeconds: todays.reduce((s, c) => s + (c.talk_seconds ?? 0), 0),
        undisposed: todays.filter((c) => c.ended_at && !c.disposition).length,
      },
    };
  });

/** Push the agent's presence into CallTools (called by the shift controls too). */
export const syncMyStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => setStatusSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { pushAgentStatus } = await import("@/lib/calltools.server");
    return pushAgentStatus(context.userId, data.status, data.detail);
  });

/** Click-to-dial from any CRM screen. */
export const dialFromCrm = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dialSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { dialNumber } = await import("@/lib/calltools.server");
    const result = await dialNumber({
      userId: context.userId,
      phone: data.phone,
      ...(data.providerContactId ? { providerContactId: data.providerContactId } : {}),
      ...(data.campaignId ? { campaignId: data.campaignId } : {}),
      ...(data.queueId ? { queueId: data.queueId } : {}),
      ...(data.callerId ? { callerId: data.callerId } : {}),
    });

    if (data.queueItemId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("telephony_queue_items")
        .update({ status: "Dialed", updated_at: new Date().toISOString() })
        .eq("id", data.queueItemId);
    }
    return result;
  });

/** End or transfer a live call. */
export const controlLiveCall = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => callControlSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { controlCall } = await import("@/lib/calltools.server");
    return controlCall({ userId: context.userId, callUuid: data.callUuid, action: data.action });
  });

/** Write a disposition back to CallTools and mirror it locally. */
export const submitDisposition = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dispositionSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { saveDisposition } = await import("@/lib/calltools.server");
    return saveDisposition({
      userId: context.userId,
      callUuid: data.callUuid,
      dispositionId: data.dispositionId,
      ...(data.providerContactId ? { providerContactId: data.providerContactId } : {}),
      ...(data.campaignId ? { campaignId: data.campaignId } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
    });
  });

/** Create or update a contact in both systems. */
export const saveCrmContact = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => upsertContactSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { upsertProviderContact } = await import("@/lib/calltools.server");
    return upsertProviderContact({
      userId: context.userId,
      fullName: data.fullName,
      phone: data.phone,
      ...(data.email ? { email: data.email } : {}),
      ...(data.state ? { state: data.state } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
      ...(data.contactId ? { contactId: data.contactId } : {}),
      ...(data.providerContactId ? { providerContactId: data.providerContactId } : {}),
    });
  });

/** Schedule a callback in CallTools and in the CRM queue. */
export const scheduleCallback = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => callbackSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { pushCallback } = await import("@/lib/calltools.server");
    return pushCallback({
      userId: context.userId,
      phone: data.phone,
      scheduledAt: data.scheduledAt,
      ...(data.contactName ? { contactName: data.contactName } : {}),
      ...(data.campaignId ? { campaignId: data.campaignId } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
      ...(data.contactId ? { contactId: data.contactId } : {}),
    });
  });

/** Send a text through CallTools. */
export const sendCallToolsSms = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => smsSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { sendProviderSms } = await import("@/lib/calltools.server");
    return sendProviderSms({
      userId: context.userId,
      phone: data.phone,
      body: data.body,
      ...(data.providerContactId ? { providerContactId: data.providerContactId } : {}),
    });
  });

/* ---------------------------------------------------------------- manager view */

/** Live floor: who is on a call, who is idle, and what CallTools thinks. */
export const getFloorView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertOpsAccess } = await import("@/lib/telephony-shared");
    await assertOpsAccess(context);
    const { fetchLiveCalls } = await import("@/lib/calltools.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [{ data: agents }, { data: calls }, { data: sessions }] = await Promise.all([
      supabaseAdmin
        .from("telephony_agents")
        .select(
          "id, provider_agent_id, provider_agent_name, provider_agent_email, user_id, active, provider_status, provider_status_at, web_phone_status, last_seen_at",
        )
        .eq("provider", "calltools")
        .order("provider_agent_name"),
      supabaseAdmin
        .from("telephony_calls")
        .select("agent_user_id, agent_name, talk_seconds, disposition, started_at, ended_at")
        .eq("provider", "calltools")
        .gte("started_at", dayStart.toISOString())
        .limit(2000),
      supabaseAdmin
        .from("shift_sessions")
        .select("user_id, current_status, current_status_at, signed_in_at, signed_out_at")
        .gte("signed_in_at", dayStart.toISOString()),
    ]);

    let live: Awaited<ReturnType<typeof fetchLiveCalls>> = [];
    let liveError: string | null = null;
    try {
      live = await fetchLiveCalls();
    } catch (err) {
      liveError = err instanceof Error ? err.message : "CallTools did not answer";
    }

    const shiftByUser = new Map((sessions ?? []).map((s) => [s.user_id, s]));
    const statsByUser = new Map<string, { calls: number; connected: number; talkSeconds: number }>();
    for (const c of calls ?? []) {
      const key = c.agent_user_id ?? c.agent_name ?? "unassigned";
      const row = statsByUser.get(key) ?? { calls: 0, connected: 0, talkSeconds: 0 };
      row.calls += 1;
      if ((c.talk_seconds ?? 0) >= 30) row.connected += 1;
      row.talkSeconds += c.talk_seconds ?? 0;
      statsByUser.set(key, row);
    }
    const liveByAgent = new Map(live.map((c) => [c.agentId ?? "", c]));

    const roster = (agents ?? []).map((a) => {
      const shift = a.user_id ? shiftByUser.get(a.user_id) : undefined;
      const stats = statsByUser.get(a.user_id ?? a.provider_agent_name ?? "") ?? {
        calls: 0,
        connected: 0,
        talkSeconds: 0,
      };
      const liveCall = liveByAgent.get(a.provider_agent_id) ?? null;
      return {
        ...a,
        crmStatus: shift?.signed_out_at ? "Signed Out" : (shift?.current_status ?? "Off shift"),
        statusSince: shift?.current_status_at ?? a.provider_status_at ?? null,
        ...stats,
        liveCall,
      };
    });

    return {
      roster,
      live,
      liveError,
      totals: {
        onCall: live.length,
        linked: roster.filter((r) => r.user_id).length,
        agents: roster.length,
        calls: (calls ?? []).length,
        talkSeconds: (calls ?? []).reduce((s, c) => s + (c.talk_seconds ?? 0), 0),
      },
    };
  });

/** Leaderboard and campaign metrics pulled live from CallTools. */
export const getCallToolsPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertOpsAccess } = await import("@/lib/telephony-shared");
    await assertOpsAccess(context);
    const { ctList } = await import("@/lib/calltools.server");
    const { CT } = await import("@/lib/calltools-shared");

    const safe = async (path: string) => {
      try {
        return { rows: await ctList<Json>(path, 1, 100), error: null as string | null };
      } catch (err) {
        return { rows: [] as Json[], error: err instanceof Error ? err.message : "Unavailable" };
      }
    };

    const [leaderboard, performance, campaigns] = await Promise.all([
      safe(CT.agentLeaderboard),
      safe(CT.agentPerformance),
      safe(CT.campaigns),
    ]);

    return { leaderboard, performance, campaigns };
  });

/* --------------------------------------------------------------- admin control */

/** Connection settings, write-queue health and the audit log. */
export const getIntegrationControl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminAccess } = await import("@/lib/telephony-shared");
    await assertAdminAccess(context);
    const { getSettings, getWriteHealth } = await import("@/lib/calltools.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [settings, health, { data: agents }, { data: dispositions }, { data: profiles }] =
      await Promise.all([
        getSettings(),
        getWriteHealth(),
        supabaseAdmin
          .from("telephony_agents")
          .select("id, provider_agent_id, provider_agent_name, provider_agent_email, user_id, active, provider_status, web_phone_status")
          .eq("provider", "calltools")
          .order("provider_agent_name"),
        supabaseAdmin
          .from("telephony_dispositions")
          .select("provider_disposition_id, name, category, is_sale, is_callback, active")
          .order("sort_order"),
        supabaseAdmin.from("profiles").select("id, name, email, department").order("name"),
      ]);

    return {
      settings,
      health,
      agents: agents ?? [],
      dispositions: dispositions ?? [],
      profiles: profiles ?? [],
      keyConfigured: Boolean(process.env["CALLTOOLS_API_KEY"]),
    };
  });

export const updateIntegrationSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => settingsSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdminAccess } = await import("@/lib/telephony-shared");
    await assertAdminAccess(context);
    const { saveSettings } = await import("@/lib/calltools.server");
    return saveSettings(data as Record<string, unknown>, context.userId);
  });

export const linkCallToolsAgent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ agentRowId: z.string().uuid(), userId: z.string().uuid().nullable() }).parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdminAccess } = await import("@/lib/telephony-shared");
    await assertAdminAccess(context);
    const { linkAgent } = await import("@/lib/calltools.server");
    return linkAgent(data.agentRowId, data.userId);
  });

/** Pull dispositions + agent statuses and register the real-time hooks. */
export const refreshCallToolsReference = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ registerWebhooks: z.boolean().optional(), origin: z.string().max(200).optional() }).parse(data ?? {}),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdminAccess } = await import("@/lib/telephony-shared");
    await assertAdminAccess(context);
    const { syncDispositions, syncAgentStatuses, ensureWebhooks } = await import("@/lib/calltools.server");

    const out: Record<string, Json> = {};
    try {
      out["dispositions"] = await syncDispositions();
    } catch (err) {
      out["dispositionsError"] = err instanceof Error ? err.message : "Failed";
    }
    try {
      out["agents"] = await syncAgentStatuses();
    } catch (err) {
      out["agentsError"] = err instanceof Error ? err.message : "Failed";
    }
    if (data.registerWebhooks && data.origin) {
      try {
        out["webhooks"] = await ensureWebhooks(data.origin, context.userId);
      } catch (err) {
        out["webhooksError"] = err instanceof Error ? err.message : "Failed";
      }
    }
    return out;
  });

/** Retry the queued writes that have not reached CallTools yet. */
export const flushWriteQueue = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid().optional() }).parse(data ?? {}))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertOpsAccess } = await import("@/lib/telephony-shared");
    await assertOpsAccess(context);
    const { drainOutbox, retryOutboxRow } = await import("@/lib/calltools.server");
    if (data.id) {
      const res = await retryOutboxRow(data.id);
      return { drained: 1, sent: res.ok ? 1 : 0, failed: res.ok ? 0 : 1, skipped: null as string | null };
    }
    return drainOutbox(50);
  });
