/**
 * CallTools two-way engine (server only).
 *
 * Reads and writes against the live CallTools REST API using field names taken
 * from their OpenAPI document. Every write goes through the outbox so a provider
 * outage never loses an agent action, and every HTTP call is recorded in
 * `telephony_action_log` for audit.
 */

import { CT } from "@/lib/calltools-shared";
import type { CrmStatus, TelephonySettings } from "@/lib/calltools-shared";
import { normalizeE164 } from "@/lib/phone";
import type { Json } from "@/integrations/supabase/types";

const PROVIDER = "calltools";

export class CallToolsError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

function baseUrl() {
  return (process.env["CALLTOOLS_BASE_URL"] || "https://west-2.calltools.io/api").replace(/\/$/, "");
}

function apiKey() {
  const key = process.env["CALLTOOLS_API_KEY"];
  if (!key) throw new CallToolsError("CallTools API key is not configured", 0);
  return key;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RawResult {
  ok: boolean;
  status: number;
  body: Json;
  durationMs: number;
}

/** Single place where an HTTP request actually leaves the CRM. */
export async function ctRequest(
  path: string,
  method: Method = "GET",
  payload?: unknown,
): Promise<RawResult> {
  const started = Date.now();
  const headers: Record<string, string> = {
    Authorization: `Token ${apiKey()}`,
    Accept: "application/json",
  };
  if (payload !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    signal: AbortSignal.timeout(20000),
  });

  const text = await res.text();
  let body: Json = text;
  try {
    body = text ? (JSON.parse(text) as Json) : null;
  } catch {
    /* provider returned HTML or plain text */
  }
  return { ok: res.ok, status: res.status, body, durationMs: Date.now() - started };
}

/** GET helper that throws on failure and returns a typed body. */
export async function ctGet<T>(path: string): Promise<T> {
  const res = await ctRequest(path, "GET");
  if (!res.ok) throw new CallToolsError(`CallTools returned HTTP ${res.status}`, res.status);
  return res.body as T;
}

interface Paged<T> {
  count?: number;
  next?: string | null;
  results?: T[];
}

/** Walk a paginated list endpoint up to `maxPages`. */
export async function ctList<T>(path: string, maxPages = 5, pageSize = 200): Promise<T[]> {
  const out: T[] = [];
  const sep = path.includes("?") ? "&" : "?";
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await ctRequest(`${path}${sep}page_size=${pageSize}&page=${page}`, "GET");
    if (!res.ok) {
      if (page === 1) throw new CallToolsError(`CallTools returned HTTP ${res.status}`, res.status);
      break;
    }
    const body = res.body as Paged<T> | T[] | null;
    const rows = Array.isArray(body) ? body : (body?.results ?? []);
    out.push(...rows);
    if (Array.isArray(body) || !(body as Paged<T>)?.next) break;
  }
  return out;
}

/* ------------------------------------------------------------------ settings */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getSettings(): Promise<TelephonySettings> {
  const db = await admin();
  const { data } = await db.from("telephony_settings").select("*").eq("provider", PROVIDER).maybeSingle();
  if (data) return data as TelephonySettings;
  const { data: created, error } = await db
    .from("telephony_settings")
    .insert({ provider: PROVIDER })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created as TelephonySettings;
}

export async function saveSettings(patch: Record<string, unknown>, actorId: string) {
  const db = await admin();
  const current = await getSettings();
  const { data, error } = await db
    .from("telephony_settings")
    .update({ ...patch, updated_by: actorId, updated_at: new Date().toISOString() })
    .eq("id", current.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as TelephonySettings;
}

/* ------------------------------------------------------------------- logging */

async function logAction(entry: {
  action: string;
  method: string;
  path: string;
  request?: unknown;
  response?: unknown;
  responseStatus?: number | null;
  ok: boolean;
  error?: string | null;
  durationMs?: number | null;
  outboxId?: string | null;
  actorId?: string | null;
}) {
  const db = await admin();
  await db.from("telephony_action_log").insert({
    provider: PROVIDER,
    action: entry.action,
    method: entry.method,
    path: entry.path,
    request: (entry.request ?? null) as Json,
    response: (entry.response ?? null) as Json,
    response_status: entry.responseStatus ?? null,
    ok: entry.ok,
    error: entry.error ?? null,
    duration_ms: entry.durationMs ?? null,
    outbox_id: entry.outboxId ?? null,
    actor_id: entry.actorId ?? null,
  });
}

/* -------------------------------------------------------------------- outbox */

export interface OutboxRow {
  id: string;
  action: string;
  method: string;
  path: string;
  payload: Record<string, unknown> | null;
  status: string;
  attempts: number;
  max_attempts: number;
  requested_by: string | null;
  target_ref: string | null;
}

const BACKOFF_SECONDS = [10, 30, 120, 600, 1800];

/**
 * Queue a provider write and attempt it immediately. Returns whether CallTools
 * accepted it now — a `false` result means it is queued and will retry.
 */
export async function enqueueWrite(input: {
  action: string;
  method: Method;
  path: string;
  payload?: Record<string, unknown>;
  actorId: string | null;
  targetRef?: string | null;
  /** Skip the immediate attempt (used by the drain loop). */
  deferred?: boolean;
}) {
  const db = await admin();
  const settings = await getSettings();

  const { data: row, error } = await db
    .from("telephony_outbox")
    .insert({
      provider: PROVIDER,
      action: input.action,
      method: input.method,
      path: input.path,
      payload: (input.payload ?? {}) as Json,
      requested_by: input.actorId,
      target_ref: input.targetRef ?? null,
      status: "Pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  if (!settings.writes_enabled) {
    await markOutbox(row.id, {
      status: "Pending",
      attempts: 0,
      lastError: "Sending to CallTools is switched off in settings",
      nextAttemptAt: new Date(Date.now() + 300_000).toISOString(),
    });
    return { queued: true, sent: false, id: row.id, error: "Writes are disabled" as string | null, response: null as Json };
  }

  if (input.deferred) return { queued: true, sent: false, id: row.id, error: null as string | null, response: null as Json };

  const result = await deliver(row as OutboxRow);
  return { queued: true, sent: result.ok, id: row.id, error: result.error, response: result.response };
}

async function markOutbox(
  id: string,
  patch: { status: string; attempts?: number; lastError?: string | null; nextAttemptAt?: string; response?: unknown; responseStatus?: number | null },
) {
  const db = await admin();
  await db
    .from("telephony_outbox")
    .update({
      status: patch.status,
      ...(patch.attempts === undefined ? {} : { attempts: patch.attempts }),
      last_error: patch.lastError ?? null,
      ...(patch.nextAttemptAt ? { next_attempt_at: patch.nextAttemptAt } : {}),
      ...(patch.response === undefined ? {} : { response: patch.response as Json }),
      ...(patch.responseStatus === undefined ? {} : { response_status: patch.responseStatus }),
      ...(patch.status === "Sent" ? { completed_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

/** Perform one outbox row against CallTools and record the outcome. */
export async function deliver(row: OutboxRow) {
  const attempts = row.attempts + 1;
  try {
    const res = await ctRequest(
      row.path,
      row.method as Method,
      row.method === "GET" ? undefined : (row.payload ?? {}),
    );
    await logAction({
      action: row.action,
      method: row.method,
      path: row.path,
      request: row.payload,
      response: res.body,
      responseStatus: res.status,
      ok: res.ok,
      error: res.ok ? null : `HTTP ${res.status}`,
      durationMs: res.durationMs,
      outboxId: row.id,
      actorId: row.requested_by,
    });

    if (res.ok) {
      await markOutbox(row.id, { status: "Sent", attempts, response: res.body, responseStatus: res.status });
      return { ok: true, error: null as string | null, response: res.body as Json };
    }

    const permanent = res.status === 400 || res.status === 404 || res.status === 422;
    const dead = permanent || attempts >= row.max_attempts;
    const detail = typeof res.body === "string" ? res.body.slice(0, 300) : JSON.stringify(res.body).slice(0, 300);
    await markOutbox(row.id, {
      status: dead ? "Failed" : "Pending",
      attempts,
      lastError: `HTTP ${res.status}: ${detail}`,
      responseStatus: res.status,
      response: res.body,
      nextAttemptAt: new Date(
        Date.now() + (BACKOFF_SECONDS[Math.min(attempts - 1, BACKOFF_SECONDS.length - 1)] ?? 600) * 1000,
      ).toISOString(),
    });
    return { ok: false, error: `HTTP ${res.status}`, response: res.body as Json };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logAction({
      action: row.action,
      method: row.method,
      path: row.path,
      request: row.payload,
      ok: false,
      error: message,
      outboxId: row.id,
      actorId: row.requested_by,
    });
    await markOutbox(row.id, {
      status: attempts >= row.max_attempts ? "Failed" : "Pending",
      attempts,
      lastError: message,
      nextAttemptAt: new Date(
        Date.now() + (BACKOFF_SECONDS[Math.min(attempts - 1, BACKOFF_SECONDS.length - 1)] ?? 600) * 1000,
      ).toISOString(),
    });
    return { ok: false, error: message, response: null as Json };
  }
}

/** Retry every due queued write. Safe to call from cron or a manual button. */
export async function drainOutbox(limit = 25) {
  const db = await admin();
  const settings = await getSettings();
  if (!settings.writes_enabled) return { drained: 0, sent: 0, failed: 0, skipped: "writes disabled" as string | null };

  const { data: rows } = await db
    .from("telephony_outbox")
    .select("*")
    .eq("provider", PROVIDER)
    .eq("status", "Pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at")
    .limit(limit);

  let sent = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const res = await deliver(row as OutboxRow);
    if (res.ok) sent += 1;
    else failed += 1;
  }
  return { drained: (rows ?? []).length, sent, failed, skipped: null as string | null };
}

export async function retryOutboxRow(id: string) {
  const db = await admin();
  const { data: row } = await db.from("telephony_outbox").select("*").eq("id", id).maybeSingle();
  if (!row) throw new Error("Queued action not found");
  await db.from("telephony_outbox").update({ status: "Pending", next_attempt_at: new Date().toISOString() }).eq("id", id);
  return deliver({ ...(row as OutboxRow), attempts: 0 });
}

/* --------------------------------------------------------------- agent links */

export interface AgentLink {
  id: string;
  provider_agent_id: string;
  provider_agent_name: string | null;
  user_id: string | null;
  provider_status: string | null;
  web_phone_status: string | null;
}

/** The CallTools identity for a CRM user, matched by link then by email. */
export async function resolveAgentLink(userId: string): Promise<AgentLink | null> {
  const db = await admin();
  const { data: linked } = await db
    .from("telephony_agents")
    .select("id, provider_agent_id, provider_agent_name, user_id, provider_status, web_phone_status")
    .eq("provider", PROVIDER)
    .eq("user_id", userId)
    .maybeSingle();
  if (linked) return linked as AgentLink;

  const { data: profile } = await db.from("profiles").select("email, name").eq("id", userId).maybeSingle();
  if (!profile?.email) return null;

  const { data: byEmail } = await db
    .from("telephony_agents")
    .select("id, provider_agent_id, provider_agent_name, user_id, provider_status, web_phone_status")
    .eq("provider", PROVIDER)
    .ilike("provider_agent_email", profile.email)
    .maybeSingle();
  if (!byEmail) return null;

  await db.from("telephony_agents").update({ user_id: userId }).eq("id", byEmail.id);
  return { ...(byEmail as AgentLink), user_id: userId };
}

export async function linkAgent(agentRowId: string, userId: string | null) {
  const db = await admin();
  const { data, error } = await db
    .from("telephony_agents")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("id", agentRowId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/* ------------------------------------------------------------ status mapping */

export async function providerStatusFor(crmStatus: CrmStatus) {
  const db = await admin();
  const { data } = await db
    .from("telephony_status_map")
    .select("provider_status, ready")
    .eq("provider", PROVIDER)
    .eq("crm_status", crmStatus)
    .maybeSingle();
  return data ?? { provider_status: crmStatus === "Available" ? "READY" : "NOT_READY", ready: crmStatus === "Available" };
}

/**
 * Push the CRM presence into CallTools so the dialer stops sending calls the
 * moment an agent goes on break.
 */
export async function pushAgentStatus(userId: string, crmStatus: CrmStatus, detail?: string) {
  const settings = await getSettings();
  const link = await resolveAgentLink(userId);
  if (!link) return { pushed: false, reason: "This user is not linked to a CallTools agent yet" };
  if (!settings.status_sync_enabled)
    return { pushed: false, reason: "Status sync is switched off in settings" };

  const mapped = await providerStatusFor(crmStatus);
  const result = await enqueueWrite({
    action: "setAgentStatus",
    method: "PATCH",
    path: CT.agentStatus(link.provider_agent_id),
    payload: {
      status: mapped.provider_status,
      ready: mapped.ready,
      ...(detail ? { note: detail } : {}),
    },
    actorId: userId,
    targetRef: link.provider_agent_id,
  });

  const db = await admin();
  await db
    .from("telephony_agents")
    .update({
      provider_status: mapped.provider_status,
      provider_status_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", link.id);

  return {
    pushed: result.sent,
    queued: !result.sent,
    providerStatus: mapped.provider_status,
    reason: result.error,
  };
}

/* ---------------------------------------------------------------- click to dial */

/**
 * CallTools starts outbound calls by replaying a connector-button click, so we
 * post a `connectorbuttonevents` record with `auto_call_triggered`.
 */
export async function dialNumber(input: {
  userId: string;
  phone: string;
  providerContactId?: string;
  campaignId?: string;
  queueId?: string;
  callerId?: string;
}) {
  const settings = await getSettings();
  if (!settings.dial_enabled) throw new CallToolsError("Calling from the CRM is switched off in settings");
  const link = await resolveAgentLink(input.userId);
  if (!link) throw new CallToolsError("Link your CallTools agent before dialing");

  const phone = normalizeE164(input.phone) ?? input.phone;
  const campaign = input.campaignId ?? settings.default_campaign_id;
  const queue = input.queueId ?? settings.default_queue_id;
  const callerId = input.callerId ?? settings.default_caller_id;

  const payload: Record<string, unknown> = {
    connector_button: settings.connector_button_id,
    app_user: link.provider_agent_id,
    phone_number: phone,
    auto_call_triggered: true,
    ...(input.providerContactId ? { contact: input.providerContactId } : {}),
    ...(campaign ? { campaign } : {}),
    ...(queue ? { queue } : {}),
    ...(callerId ? { caller_id: callerId } : {}),
  };

  const result = await enqueueWrite({
    action: "dial",
    method: "POST",
    path: CT.connectorButtonEvents,
    payload,
    actorId: input.userId,
    targetRef: phone,
  });

  return { dialing: result.sent, queued: !result.sent, phone, error: result.error, response: result.response };
}

/* -------------------------------------------------------------- call control */

export async function controlCall(input: { userId: string; callUuid: string; action: "hangup" | "transfer" }) {
  const path = input.action === "hangup" ? CT.hangup(input.callUuid) : CT.hangupTransfer(input.callUuid);
  const result = await enqueueWrite({
    action: input.action,
    method: "POST",
    path,
    payload: {},
    actorId: input.userId,
    targetRef: input.callUuid,
  });
  return { applied: result.sent, queued: !result.sent, error: result.error };
}

/* --------------------------------------------------------------- disposition */

export async function saveDisposition(input: {
  userId: string;
  callUuid: string;
  dispositionId: string;
  providerContactId?: string;
  campaignId?: string;
  notes?: string;
  phone?: string;
}) {
  const settings = await getSettings();
  const link = await resolveAgentLink(input.userId);

  const result = await enqueueWrite({
    action: "saveDisposition",
    method: "POST",
    path: CT.historicalDispositions,
    payload: {
      call: input.callUuid,
      call_disposition: input.dispositionId,
      ...(link ? { app_user: link.provider_agent_id } : {}),
      ...(input.providerContactId ? { contact: input.providerContactId } : {}),
      ...(input.campaignId ?? settings.default_campaign_id
        ? { campaign: input.campaignId ?? settings.default_campaign_id }
        : {}),
      ...(input.notes ? { note: input.notes } : {}),
    },
    actorId: input.userId,
    targetRef: input.callUuid,
  });

  // Reflect it locally straight away so the agent's screen is never stale.
  const db = await admin();
  const { data: disposition } = await db
    .from("telephony_dispositions")
    .select("name, is_sale, is_callback")
    .eq("provider", PROVIDER)
    .eq("provider_disposition_id", input.dispositionId)
    .maybeSingle();

  await db
    .from("telephony_calls")
    .update({ disposition: disposition?.name ?? input.dispositionId, updated_at: new Date().toISOString() })
    .eq("provider", PROVIDER)
    .eq("provider_call_id", input.callUuid);

  if (input.notes) {
    await enqueueWrite({
      action: "saveDisposition",
      method: "POST",
      path: CT.notes,
      payload: {
        ...(input.providerContactId ? { contact: input.providerContactId } : {}),
        note: input.notes,
      },
      actorId: input.userId,
      targetRef: input.callUuid,
      deferred: true,
    });
  }

  return {
    saved: result.sent,
    queued: !result.sent,
    disposition: disposition?.name ?? input.dispositionId,
    isSale: disposition?.is_sale ?? false,
    isCallback: disposition?.is_callback ?? false,
    error: result.error,
  };
}

/* ------------------------------------------------------------------ contacts */

export async function upsertProviderContact(input: {
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  state?: string;
  notes?: string;
  contactId?: string;
  providerContactId?: string;
}) {
  const phone = normalizeE164(input.phone) ?? input.phone;
  const [first, ...rest] = input.fullName.trim().split(/\s+/);
  const payload: Record<string, unknown> = {
    first_name: first ?? input.fullName,
    last_name: rest.join(" ") || "",
    phone_number: phone,
    ...(input.email ? { email: input.email } : {}),
    ...(input.state ? { state: input.state } : {}),
  };

  const result = await enqueueWrite({
    action: "upsertContact",
    method: input.providerContactId ? "PATCH" : "POST",
    path: input.providerContactId ? CT.contact(input.providerContactId) : CT.contacts,
    payload,
    actorId: input.userId,
    targetRef: phone,
  });

  // Keep the CRM copy authoritative regardless of the provider result.
  const db = await admin();
  await db.from("contacts").upsert(
    {
      ...(input.contactId ? { id: input.contactId } : {}),
      full_name: input.fullName,
      phone,
      email: input.email || null,
      state: input.state || null,
      source: "CallTools",
      status: "New",
      owner_id: input.userId,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  return { saved: result.sent, queued: !result.sent, phone, error: result.error, response: result.response };
}

export async function pushCallback(input: {
  userId: string;
  phone: string;
  contactName?: string;
  scheduledAt: string;
  campaignId?: string;
  notes?: string;
  contactId?: string;
}) {
  const settings = await getSettings();
  const phone = normalizeE164(input.phone) ?? input.phone;
  const result = await enqueueWrite({
    action: "pushCallback",
    method: "POST",
    path: CT.webCallbackRequests,
    payload: {
      phone_number: phone,
      scheduled_for: new Date(input.scheduledAt).toISOString(),
      ...(input.contactName ? { name: input.contactName } : {}),
      ...(input.notes ? { note: input.notes } : {}),
      ...(input.campaignId ?? settings.default_campaign_id
        ? { campaign: input.campaignId ?? settings.default_campaign_id }
        : {}),
    },
    actorId: input.userId,
    targetRef: phone,
  });

  const db = await admin();
  await db.from("telephony_queue_items").insert({
    provider: PROVIDER,
    kind: "callback",
    contact_id: input.contactId ?? null,
    contact_name: input.contactName ?? phone,
    phone_e164: phone,
    scheduled_at: new Date(input.scheduledAt).toISOString(),
    assigned_user_id: input.userId,
    status: result.sent ? "Scheduled" : "Queued",
    notes: input.notes ?? null,
  });

  return { scheduled: result.sent, queued: !result.sent, error: result.error };
}

export async function sendProviderSms(input: {
  userId: string;
  phone: string;
  body: string;
  providerContactId?: string;
}) {
  const phone = normalizeE164(input.phone) ?? input.phone;
  const result = await enqueueWrite({
    action: "sendSms",
    method: "POST",
    path: CT.sms,
    payload: {
      to: phone,
      message: input.body,
      ...(input.providerContactId ? { contact: input.providerContactId } : {}),
    },
    actorId: input.userId,
    targetRef: phone,
  });
  return { sent: result.sent, queued: !result.sent, error: result.error };
}

/* --------------------------------------------------------------- reference sync */

/** Pull the disposition list so agents pick real CallTools outcomes. */
export async function syncDispositions() {
  const rows = await ctList<Record<string, unknown>>(CT.dispositions, 3);
  const db = await admin();
  const saleWords = /sale|sold|closed|enrolled/i;
  const callbackWords = /callback|call back|follow.?up|schedule/i;

  const payload = rows
    .map((r, index) => {
      const id = String(r["id"] ?? r["uuid"] ?? "");
      const name = String(r["name"] ?? r["title"] ?? id);
      if (!id) return null;
      return {
        provider: PROVIDER,
        provider_disposition_id: id,
        name,
        category: (r["category"] as string) ?? (r["disposition_type"] as string) ?? null,
        is_sale: saleWords.test(name),
        is_callback: callbackWords.test(name),
        active: r["is_active"] === undefined ? true : Boolean(r["is_active"]),
        sort_order: typeof r["order"] === "number" ? (r["order"] as number) : index,
        raw: r as Json,
        synced_at: new Date().toISOString(),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (payload.length) {
    const { error } = await db
      .from("telephony_dispositions")
      .upsert(payload, { onConflict: "provider,provider_disposition_id" });
    if (error) throw new Error(error.message);
  }
  return { dispositions: payload.length };
}

/** Refresh every agent's provider status and web-phone registration. */
export async function syncAgentStatuses() {
  const rows = await ctList<Record<string, unknown>>(CT.agentStatuses, 3);
  const db = await admin();
  let updated = 0;
  for (const r of rows) {
    const appUser = String(r["app_user"] ?? r["app_user_id"] ?? r["id"] ?? "");
    if (!appUser) continue;
    const { error } = await db
      .from("telephony_agents")
      .update({
        provider_status: (r["status"] as string) ?? (r["agent_status"] as string) ?? null,
        provider_status_at: (r["status_changed_on"] as string) ?? new Date().toISOString(),
        web_phone_status: (r["web_phone_status"] as string) ?? null,
        last_seen_at: new Date().toISOString(),
      })
      .eq("provider", PROVIDER)
      .eq("provider_agent_id", appUser);
    if (!error) updated += 1;
  }
  return { agents: rows.length, updated };
}

export interface LiveCall {
  callUuid: string;
  agentId: string | null;
  agentName: string | null;
  direction: string | null;
  from: string | null;
  to: string | null;
  status: string | null;
  campaign: string | null;
  startedAt: string | null;
  seconds: number;
}

/** Calls in progress right now, straight from CallTools. */
export async function fetchLiveCalls(): Promise<LiveCall[]> {
  const rows = await ctList<Record<string, unknown>>(CT.liveCalls, 2, 100);
  const db = await admin();
  const { data: agents } = await db
    .from("telephony_agents")
    .select("provider_agent_id, provider_agent_name")
    .eq("provider", PROVIDER);
  const nameById = new Map((agents ?? []).map((a) => [a.provider_agent_id, a.provider_agent_name]));

  return rows.map((r) => {
    const startedAt = (r["start"] as string) ?? (r["created_on"] as string) ?? null;
    const agentId = (r["app_user"] as string) ?? (r["agent"] as string) ?? null;
    return {
      callUuid: String(r["uuid"] ?? r["call_uuid"] ?? r["id"] ?? ""),
      agentId,
      agentName: (agentId ? nameById.get(agentId) : null) ?? (r["agent_name"] as string) ?? null,
      direction: (r["call_type"] as string) ?? (r["direction"] as string) ?? null,
      from: (r["source"] as string) ?? (r["from_number"] as string) ?? null,
      to: (r["destination"] as string) ?? (r["to_number"] as string) ?? null,
      status: (r["state"] as string) ?? (r["status"] as string) ?? null,
      campaign: (r["campaign_name"] as string) ?? (r["campaign"] as string) ?? null,
      startedAt,
      seconds: startedAt ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)) : 0,
    };
  });
}

/* ------------------------------------------------------------------ webhooks */

const HOOK_EVENTS = [
  "call.started",
  "call.ended",
  "call.disposition",
  "agent.status",
  "sms.received",
] as const;

/** Register (or refresh) the real-time subscriptions that feed the CRM. */
export async function ensureWebhooks(publicBaseUrl: string, actorId: string) {
  const settings = await getSettings();
  const target = `${publicBaseUrl.replace(/\/$/, "")}/api/public/hooks/calltools?token=${settings.webhook_token}`;

  const existing = await ctList<Record<string, unknown>>(CT.restHooks, 2, 100).catch(() => []);
  const already = new Set(
    existing
      .filter((h) => String(h["target_url"] ?? h["target"] ?? "").startsWith(publicBaseUrl))
      .map((h) => String(h["event"] ?? h["event_type"] ?? "")),
  );

  const created: string[] = [];
  for (const event of HOOK_EVENTS) {
    if (already.has(event)) continue;
    const res = await enqueueWrite({
      action: "registerWebhook",
      method: "POST",
      path: CT.restHooks,
      payload: { event, target_url: target, is_active: true },
      actorId,
      targetRef: event,
    });
    if (res.sent) created.push(event);
  }
  return { target, registered: created, alreadyActive: [...already] };
}

/** Apply one inbound CallTools event. Never throws — webhooks must always 200. */
export async function applyWebhookEvent(event: string, payload: Record<string, unknown>) {
  const db = await admin();
  try {
    if (event.startsWith("agent")) {
      const appUser = String(payload["app_user"] ?? payload["app_user_id"] ?? "");
      if (appUser) {
        await db
          .from("telephony_agents")
          .update({
            provider_status: (payload["status"] as string) ?? null,
            provider_status_at: new Date().toISOString(),
            web_phone_status: (payload["web_phone_status"] as string) ?? null,
            last_seen_at: new Date().toISOString(),
          })
          .eq("provider", PROVIDER)
          .eq("provider_agent_id", appUser);
      }
      return { applied: "agent_status" };
    }

    const callId = String(payload["uuid"] ?? payload["call_uuid"] ?? payload["id"] ?? "");
    if (!callId) return { applied: "ignored" };

    const phone =
      normalizeE164(String(payload["destination"] ?? payload["to_number"] ?? "")) ??
      normalizeE164(String(payload["source"] ?? payload["from_number"] ?? ""));

    const { data: agent } = await db
      .from("telephony_agents")
      .select("id, user_id, provider_agent_name")
      .eq("provider", PROVIDER)
      .eq("provider_agent_id", String(payload["app_user"] ?? ""))
      .maybeSingle();

    await db.from("telephony_calls").upsert(
      {
        provider: PROVIDER,
        provider_call_id: callId,
        agent_id: agent?.id ?? null,
        agent_user_id: agent?.user_id ?? null,
        agent_name: agent?.provider_agent_name ?? (payload["agent_name"] as string) ?? null,
        direction: (payload["call_type"] as string) ?? (payload["direction"] as string) ?? null,
        from_number: (payload["source"] as string) ?? (payload["from_number"] as string) ?? null,
        to_number: (payload["destination"] as string) ?? (payload["to_number"] as string) ?? null,
        lead_phone_e164: phone,
        status: (payload["state"] as string) ?? (payload["status"] as string) ?? null,
        disposition: (payload["disposition"] as string) ?? null,
        campaign: (payload["campaign_name"] as string) ?? null,
        talk_seconds:
          typeof payload["billsec"] === "number"
            ? (payload["billsec"] as number)
            : typeof payload["duration"] === "number"
              ? (payload["duration"] as number)
              : 0,
        recording_url: (payload["recording_url"] as string) ?? null,
        started_at: (payload["start"] as string) ?? new Date().toISOString(),
        ended_at: (payload["end"] as string) ?? (event.endsWith("ended") ? new Date().toISOString() : null),
        raw: payload as Json,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "provider,provider_call_id" },
    );

    if (phone) {
      const { rebuildJourneys } = await import("@/lib/telephony.server");
      await rebuildJourneys([phone]);
    }
    return { applied: "call" };
  } catch (err) {
    await logAction({
      action: "webhook",
      method: "POST",
      path: "/api/public/hooks/calltools",
      request: payload,
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return { applied: "error" };
  }
}

/* -------------------------------------------------------------------- health */

export async function getWriteHealth() {
  const db = await admin();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [{ data: pending }, { data: recent }, { data: log }] = await Promise.all([
    db
      .from("telephony_outbox")
      .select("id, action, path, status, attempts, max_attempts, last_error, target_ref, created_at, next_attempt_at")
      .in("status", ["Pending", "Failed"])
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("telephony_outbox")
      .select("status")
      .gte("created_at", since)
      .limit(1000),
    db
      .from("telephony_action_log")
      .select("id, action, method, path, ok, response_status, error, duration_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const rows = recent ?? [];
  return {
    queue: pending ?? [],
    log: log ?? [],
    totals24h: {
      total: rows.length,
      sent: rows.filter((r) => r.status === "Sent").length,
      pending: rows.filter((r) => r.status === "Pending").length,
      failed: rows.filter((r) => r.status === "Failed").length,
    },
  };
}
