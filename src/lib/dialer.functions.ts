/**
 * Server functions for the real-time dialer: agent desk state, call control,
 * dispositions, callbacks, power dialing and the phone-system configuration.
 *
 * Thin wrapper module — imports, types and server-function declarations only.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeE164 } from "@/lib/phone";
import {
  businessHoursSchema,
  callActionSchema,
  callbackSchema,
  callbackUpdateSchema,
  campaignSchema,
  CLOSING_DISPOSITIONS,
  dialTaskSchema,
  ivrMenuSchema,
  phoneNumberSchema,
  queueSchema,
  startCallSchema,
  wrapCallSchema,
} from "@/lib/dialer-shared";

/** Everything the agent desk renders in one round-trip. */
export const getDialerDesk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [mine, waiting, callbacks, today, numbers, queues, campaigns, hours, menus, tasks] =
      await Promise.all([
        supabase
          .from("dialer_calls")
          .select("*")
          .eq("agent_user_id", userId)
          .in("state", ["ringing", "connected", "hold", "wrap"])
          .order("queued_at", { ascending: false })
          .limit(5),
        supabase
          .from("dialer_calls")
          .select("*")
          .eq("state", "queued")
          .eq("direction", "inbound")
          .order("queued_at", { ascending: true })
          .limit(25),
        supabase
          .from("callbacks")
          .select("*")
          .not("status", "in", '("Completed","Cancelled")')
          .order("scheduled_at", { ascending: true, nullsFirst: false })
          .limit(50),
        supabase
          .from("dialer_calls")
          .select("*")
          .eq("agent_user_id", userId)
          .gte("queued_at", dayStart.toISOString())
          .order("queued_at", { ascending: false })
          .limit(60),
        supabase.from("phone_numbers").select("*").eq("active", true).order("label"),
        supabase.from("call_queues").select("*").eq("active", true).order("priority"),
        supabase.from("dialer_campaigns").select("*").eq("active", true).order("name"),
        supabase.from("business_hours").select("*").order("name"),
        supabase.from("ivr_menus").select("*").eq("active", true).order("name"),
        supabase
          .from("dial_tasks")
          .select("*")
          .eq("status", "pending")
          .order("next_attempt_at", { ascending: true, nullsFirst: true })
          .limit(30),
      ]);

    const todays = today.data ?? [];
    return {
      active: (mine.data ?? [])[0] ?? null,
      queue: waiting.data ?? [],
      callbacks: callbacks.data ?? [],
      today: todays,
      numbers: numbers.data ?? [],
      queues: queues.data ?? [],
      campaigns: campaigns.data ?? [],
      hours: hours.data ?? [],
      menus: menus.data ?? [],
      tasks: tasks.data ?? [],
      stats: {
        calls: todays.length,
        connected: todays.filter((c) => c.answered_at).length,
        talkSeconds: todays.reduce((s, c) => s + (c.talk_seconds ?? 0), 0),
        sales: todays.filter((c) => c.disposition === "Sold").length,
        waiting: (waiting.data ?? []).length,
      },
    };
  });

/** Place an outbound call (manual, click-to-call, power dialer or callback). */
export const startCall = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => startCallSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const phone = normalizeE164(data.phone);
    if (!phone) throw new Error("Enter a valid phone number");
    const { supabase, userId } = context;

    const { assertDialable } = await import("@/lib/dnc.server");
    await assertDialable(supabase, phone, {
      userId,
      source: `dialer:${data.mode}`,
      detail: { campaignId: data.campaignId ?? null, dialTaskId: data.dialTaskId ?? null },
    });


    const from = data.fromNumberId
      ? (await supabase.from("phone_numbers").select("e164").eq("id", data.fromNumberId).maybeSingle()).data
      : null;

    const { data: call, error } = await supabase
      .from("dialer_calls")
      .insert({
        direction: "outbound",
        phone_e164: phone,
        to_number: phone,
        from_number: from?.e164 ?? null,
        contact_id: data.contactId ?? null,
        contact_name: data.contactName ?? null,
        agent_user_id: userId,
        queue_id: data.queueId ?? null,
        campaign_id: data.campaignId ?? null,
        dial_task_id: data.dialTaskId ?? null,
        phone_number_id: data.fromNumberId ?? null,
        state: "ringing",
        provider: "crm",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.dialTaskId) {
      await supabase
        .from("dial_tasks")
        .update({
          status: "calling",
          assigned_to: userId,
          attempts: (
            (await supabase.from("dial_tasks").select("attempts").eq("id", data.dialTaskId).maybeSingle())
              .data?.attempts ?? 0
          ) + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", data.dialTaskId);
    }
    if (data.callbackId) {
      await supabase
        .from("callbacks")
        .update({ status: "Calling", assigned_to: userId, last_attempt_at: new Date().toISOString() })
        .eq("id", data.callbackId);
    }

    return { call };
  });

/** Answer / hold / resume / mute / hangup / transfer for a call in progress. */
export const controlCall = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => callActionSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: call } = await supabase.from("dialer_calls").select("*").eq("id", data.callId).maybeSingle();
    if (!call) throw new Error("Call not found");

    const now = new Date();
    const patch: Record<string, unknown> = {};

    if (data.action === "answer") {
      patch["state"] = "connected";
      patch["agent_user_id"] = userId;
      patch["answered_at"] = now.toISOString();
      patch["wait_seconds"] = Math.max(
        0,
        Math.round((now.getTime() - new Date(call.queued_at).getTime()) / 1000),
      );
    } else if (data.action === "hold") {
      patch["state"] = "hold";
      patch["on_hold"] = true;
    } else if (data.action === "resume") {
      patch["state"] = "connected";
      patch["on_hold"] = false;
      patch["hold_seconds"] = (call.hold_seconds ?? 0) + 0;
    } else if (data.action === "mute" || data.action === "unmute") {
      patch["muted"] = data.action === "mute";
    } else if (data.action === "hangup" || data.action === "transfer") {
      const start = call.answered_at ? new Date(call.answered_at).getTime() : now.getTime();
      patch["state"] = "wrap";
      patch["ended_at"] = now.toISOString();
      patch["on_hold"] = false;
      patch["muted"] = false;
      patch["talk_seconds"] = Math.max(0, Math.round((now.getTime() - start) / 1000));
      if (data.action === "transfer") {
        patch["notes"] = `${call.notes ? `${call.notes}\n` : ""}Transferred to ${data.transferTo ?? "queue"}`;
      }
    }

    const { data: updated, error } = await supabase
      .from("dialer_calls")
      .update(patch as never)
      .eq("id", data.callId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { call: updated };
  });

/** Close a call with an outcome, optionally booking the follow-up callback. */
export const wrapCall = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => wrapCallSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: call } = await supabase.from("dialer_calls").select("*").eq("id", data.callId).maybeSingle();
    if (!call) throw new Error("Call not found");

    const now = new Date();
    const talk =
      call.talk_seconds && call.talk_seconds > 0
        ? call.talk_seconds
        : call.answered_at
          ? Math.max(0, Math.round((now.getTime() - new Date(call.answered_at).getTime()) / 1000))
          : 0;

    const { error } = await supabase
      .from("dialer_calls")
      .update({
        state: "ended",
        disposition: data.disposition,
        notes: data.notes ?? call.notes,
        ended_at: call.ended_at ?? now.toISOString(),
        talk_seconds: talk,
      })
      .eq("id", data.callId);
    if (error) throw new Error(error.message);

    if (call.dial_task_id) {
      const closing = CLOSING_DISPOSITIONS.includes(data.disposition);
      await supabase
        .from("dial_tasks")
        .update({
          status: closing ? "closed" : "pending",
          last_outcome: data.disposition,
          next_attempt_at: closing ? null : new Date(now.getTime() + 2 * 3600_000).toISOString(),
        })
        .eq("id", call.dial_task_id);
    }

    // A "DNC" outcome adds the number to the Do-Not-Call list and audit trail.
    if (data.disposition === "DNC") {
      const target = call.phone_e164 ?? call.to_number ?? call.from_number;
      if (target) {
        const { addToDnc } = await import("@/lib/dnc.server");
        await addToDnc(
          supabase,
          {
            phone: target,
            contactName: call.contact_name,
            reason: "Consumer request",
            scope: "internal",
            source: "agent-wrapup",
            notes: data.notes ?? null,
          },
          { userId },
        );
      }
    }



    if (data.callbackAt) {
      await supabase.from("callbacks").insert({
        phone_e164: call.phone_e164 ?? call.to_number ?? "",
        contact_id: call.contact_id,
        contact_name: call.contact_name,
        reason: data.callbackReason ?? data.disposition,
        detail: data.notes ?? null,
        source: "wrap-up",
        scheduled_at: new Date(data.callbackAt).toISOString(),
        status: "Scheduled",
        assigned_to: userId,
        created_by: userId,
      });
    }

    return { ok: true };
  });

/** Put a lead into the callback book. */
export const createCallback = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => callbackSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const phone = normalizeE164(data.phone);
    if (!phone) throw new Error("Enter a valid phone number");
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("callbacks")
      .insert({
        phone_e164: phone,
        contact_id: data.contactId ?? null,
        contact_name: data.contactName ?? null,
        reason: data.reason,
        detail: data.detail ?? null,
        scheduled_at: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
        status: data.scheduledAt ? "Scheduled" : "Pending",
        queue_id: data.queueId ?? null,
        assigned_to: data.assignedTo ?? null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { callback: row };
  });

/** Move a callback through its lifecycle. */
export const updateCallback = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => callbackUpdateSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = {};
    if (data.status) patch["status"] = data.status;
    if (data.scheduledAt !== undefined) {
      patch["scheduled_at"] = data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null;
    }
    if (data.assignToMe) patch["assigned_to"] = userId;
    if (data.notes !== undefined) patch["notes"] = data.notes;

    const { data: row, error } = await supabase
      .from("callbacks")
      .update(patch as never)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { callback: row };
  });

/** Simulate an inbound call arriving on a DID so routing can be tested end to end. */
export const simulateInboundCall = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        phone: z.string().min(7).max(24),
        phoneNumberId: z.string().uuid().optional(),
        queueId: z.string().uuid().optional(),
        contactName: z.string().max(120).optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const phone = normalizeE164(data.phone);
    if (!phone) throw new Error("Enter a valid caller number");
    const { supabase } = context;

    let queueId = data.queueId ?? null;
    let did: { e164: string; id: string } | null = null;
    if (data.phoneNumberId) {
      const { data: row } = await supabase
        .from("phone_numbers")
        .select("id, e164, queue_id")
        .eq("id", data.phoneNumberId)
        .maybeSingle();
      if (row) {
        did = { e164: row.e164, id: row.id };
        queueId = queueId ?? row.queue_id;
      }
    }

    const { data: call, error } = await supabase
      .from("dialer_calls")
      .insert({
        direction: "inbound",
        phone_e164: phone,
        from_number: phone,
        to_number: did?.e164 ?? null,
        phone_number_id: did?.id ?? null,
        contact_name: data.contactName ?? null,
        queue_id: queueId,
        state: "queued",
        provider: "crm",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { call };
  });

/* ------------------------------------------------------- phone system (config) */

/** Full routing configuration for the admin phone-system screen. */
export const getPhoneSystem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [numbers, queues, menus, hours, campaigns, members, profiles, ops] = await Promise.all([
      supabase.from("phone_numbers").select("*").order("label"),
      supabase.from("call_queues").select("*").order("priority"),
      supabase.from("ivr_menus").select("*").order("name"),
      supabase.from("business_hours").select("*").order("name"),
      supabase.from("dialer_campaigns").select("*").order("name"),
      supabase.from("queue_members").select("*"),
      supabase.from("profiles").select("id, name, email, team").order("name"),
      supabase.rpc("is_ops", { _user_id: userId }),
    ]);
    return {
      numbers: numbers.data ?? [],
      queues: queues.data ?? [],
      menus: menus.data ?? [],
      hours: hours.data ?? [],
      campaigns: campaigns.data ?? [],
      members: members.data ?? [],
      profiles: profiles.data ?? [],
      canEdit: Boolean(ops.data),
    };
  });

/** Create or update a DID. */
export const savePhoneNumber = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => phoneNumberSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const e164 = normalizeE164(data.e164);
    if (!e164) throw new Error("Enter a valid phone number");
    const row = {
      e164,
      label: data.label,
      provider: data.provider,
      kind: data.kind,
      ivr_menu_id: data.ivrMenuId ?? null,
      queue_id: data.queueId ?? null,
      business_hours_id: data.businessHoursId ?? null,
      after_hours_action: data.afterHoursAction,
      after_hours_target: data.afterHoursTarget ?? null,
      record_calls: data.recordCalls,
      sms_enabled: data.smsEnabled,
      active: data.active,
    };
    const query = data.id
      ? context.supabase.from("phone_numbers").update(row).eq("id", data.id)
      : context.supabase.from("phone_numbers").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Create or update a call queue. */
export const saveQueue = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => queueSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const row = {
      name: data.name,
      description: data.description ?? null,
      strategy: data.strategy,
      priority: data.priority,
      max_wait_seconds: data.maxWaitSeconds,
      wrap_seconds: data.wrapSeconds,
      ring_seconds: data.ringSeconds,
      overflow_action: data.overflowAction,
      overflow_target: data.overflowTarget ?? null,
      announce_position: data.announcePosition,
      active: data.active,
    };
    const query = data.id
      ? context.supabase.from("call_queues").update(row).eq("id", data.id)
      : context.supabase.from("call_queues").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Add or remove an agent from a queue. */
export const setQueueMember = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        queueId: z.string().uuid(),
        userId: z.string().uuid(),
        member: z.boolean(),
        skillPriority: z.coerce.number().int().min(1).max(10).default(1),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    if (data.member) {
      const { error } = await context.supabase.from("queue_members").upsert(
        { queue_id: data.queueId, user_id: data.userId, skill_priority: data.skillPriority, active: true },
        { onConflict: "queue_id,user_id" },
      );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("queue_members")
        .delete()
        .eq("queue_id", data.queueId)
        .eq("user_id", data.userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Create or update a phone menu. */
export const saveIvrMenu = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ivrMenuSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const row = {
      name: data.name,
      greeting: data.greeting,
      options: data.options,
      timeout_seconds: data.timeoutSeconds,
      invalid_message: data.invalidMessage,
      max_retries: data.maxRetries,
      active: data.active,
    };
    const query = data.id
      ? context.supabase.from("ivr_menus").update(row).eq("id", data.id)
      : context.supabase.from("ivr_menus").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Create or update a business-hours profile. */
export const saveBusinessHours = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => businessHoursSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const row = {
      name: data.name,
      timezone: data.timezone,
      schedule: data.schedule,
      holidays: data.holidays,
    };
    const query = data.id
      ? context.supabase.from("business_hours").update(row).eq("id", data.id)
      : context.supabase.from("business_hours").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Create or update a dialing campaign. */
export const saveCampaign = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => campaignSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const row = {
      name: data.name,
      mode: data.mode,
      pacing: data.pacing,
      caller_id: data.callerId ?? null,
      queue_id: data.queueId ?? null,
      max_attempts: data.maxAttempts,
      retry_minutes: data.retryMinutes,
      calling_window_start: data.callingWindowStart,
      calling_window_end: data.callingWindowEnd,
      active: data.active,
      created_by: context.userId,
    };
    const query = data.id
      ? context.supabase.from("dialer_campaigns").update(row).eq("id", data.id)
      : context.supabase.from("dialer_campaigns").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Load leads into a campaign's dialing list. */
export const addDialTasks = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dialTaskSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const rows = data.leads
      .map((lead) => {
        const phone = normalizeE164(lead.phone);
        if (!phone) return null;
        return {
          campaign_id: data.campaignId,
          phone_e164: phone,
          contact_name: lead.contactName ?? null,
          state: lead.state ?? null,
          status: "pending",
        };
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r));
    if (!rows.length) throw new Error("No usable phone numbers in that list");

    const { error } = await context.supabase.from("dial_tasks").insert(rows);
    if (error) throw new Error(error.message);
    return { added: rows.length };
  });

/**
 * Hand the agent the next lead in a campaign (power / preview dialing).
 *
 * Leads sitting on the Do-Not-Call list are never handed out: they are closed
 * with a `DNC` outcome and a `dial_blocked` compliance event instead, so the
 * agent only ever receives a dialable lead.
 */
export const claimNextLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ campaignId: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const nowIso = new Date().toISOString();
    const { data: candidates } = await supabase
      .from("dial_tasks")
      .select("*")
      .eq("campaign_id", data.campaignId)
      .eq("status", "pending")
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
      .order("next_attempt_at", { ascending: true, nullsFirst: true })
      .limit(25);

    const { findDnc, logDncEvent, actorName } = await import("@/lib/dnc.server");
    let suppressed = 0;
    let actor: string | null = null;

    for (const task of candidates ?? []) {
      const hit = await findDnc(supabase, task.phone_e164);
      if (!hit) {
        await supabase.from("dial_tasks").update({ assigned_to: userId }).eq("id", task.id);
        return { task, suppressed };
      }

      suppressed += 1;
      actor = actor ?? (await actorName(supabase, userId));
      await supabase
        .from("dial_tasks")
        .update({ status: "closed", last_outcome: "DNC", next_attempt_at: null })
        .eq("id", task.id);
      await logDncEvent(supabase, {
        phone: hit.phone_e164,
        action: "dial_blocked",
        reason: hit.reason,
        source: "dialer:power",
        detail: { scope: hit.scope, campaignId: data.campaignId, dialTaskId: task.id },
        actorId: userId,
        actorName: actor,
        entryId: hit.id,
      });
    }

    return { task: null, suppressed };
  });

