/**
 * Telephony sync engine: pulls call records from CallTools (dialer) and CallGrid
 * (inbound call tracking), normalises them into `telephony_calls`, then rebuilds
 * lead journeys so callbacks and sales can be attributed to one source or the other.
 *
 * Server-only: reads provider secrets and uses the service-role Supabase client.
 */

import { normalizeE164 } from "@/lib/phone";
import type { Json } from "@/integrations/supabase/types";

/* ------------------------------------------------------------------ providers */

export type Provider = "calltools" | "callgrid";

export interface ProviderCapabilities {
  /** Place an outbound call for an agent from inside the CRM. */
  dial: boolean;
  /** Push Available / Break / Lunch into the provider. */
  setAgentStatus: boolean;
  /** Write a call disposition back to the provider. */
  setDisposition: boolean;
  /** Push a CRM contact / lead list into a provider campaign. */
  pushContact: boolean;
  /** Provider can push events to us in near real time. */
  webhooks: boolean;
}

/**
 * What each provider actually allows today. CallTools' dialing / agent-status /
 * disposition endpoints are not exposed on the standard API plan, so those stay
 * false until the account is upgraded — flip them with the env flags below and
 * the UI enables the same buttons with no other change.
 */
export function capabilitiesFor(provider: Provider): ProviderCapabilities {
  const flag = (name: string) => process.env[name] === "true";
  if (provider === "calltools") {
    return {
      dial: flag("CALLTOOLS_DIAL_ENABLED"),
      setAgentStatus: flag("CALLTOOLS_AGENT_STATUS_ENABLED"),
      setDisposition: flag("CALLTOOLS_DISPOSITION_ENABLED"),
      pushContact: true,
      webhooks: false,
    };
  }
  return {
    dial: false,
    setAgentStatus: false,
    setDisposition: false,
    pushContact: false,
    webhooks: true,
  };
}

export class UnsupportedCapability extends Error {
  constructor(provider: Provider, capability: keyof ProviderCapabilities) {
    super(`${provider} does not expose "${capability}" on this account`);
  }
}

/* ------------------------------------------------------------------- fetching */

function callToolsBase() {
  return (process.env["CALLTOOLS_BASE_URL"] || "https://west-2.calltools.io/api").replace(/\/$/, "");
}
function callGridBase() {
  return (process.env["CALLGRID_BASE_URL"] || "https://api.callgrid.com").replace(/\/$/, "");
}

async function getJson(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* non-JSON error page */
  }
  return { ok: res.ok, status: res.status, body };
}

const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export interface NormalizedCall {
  provider: Provider;
  provider_call_id: string;
  agent_name: string | null;
  provider_agent_id: string | null;
  direction: string | null;
  from_number: string | null;
  to_number: string | null;
  lead_phone_e164: string | null;
  status: string | null;
  disposition: string | null;
  campaign: string | null;
  buyer: string | null;
  publisher: string | null;
  state_code: string | null;
  talk_seconds: number;
  revenue: number | null;
  payout: number | null;
  recording_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  raw: Json;
}

/** CallTools identifies agents by `app_user` UUID only, so names come from /users/. */
async function fetchCallToolsUsers(headers: Record<string, string>) {
  const map = new Map<string, string>();
  for (let page = 1; page <= 5; page += 1) {
    const res = await getJson(`${callToolsBase()}/users/?page_size=100&page=${page}`, headers);
    if (!res.ok) break;
    const body = res.body as { results?: Array<Record<string, unknown>>; next?: string | null } | null;
    for (const u of body?.results ?? []) {
      const id = str(u["app_user"]);
      const name = str(u["full_name"]) ?? str(u["username"]) ?? str(u["email"]);
      if (id && name) map.set(id, name);
    }
    if (!body?.next) break;
  }
  return map;
}

/** CallTools calls are agent-dialed outbound (plus inbound to the dialer). */
export async function fetchCallToolsCalls(pageSize = 100, pages = 3): Promise<NormalizedCall[]> {
  const key = process.env["CALLTOOLS_API_KEY"];
  if (!key) throw new Error("CALLTOOLS_API_KEY is not configured");
  const headers = { Authorization: `Token ${key}`, Accept: "application/json" };
  const out: NormalizedCall[] = [];
  const users = await fetchCallToolsUsers(headers);

  for (let page = 1; page <= pages; page += 1) {
    const res = await getJson(`${callToolsBase()}/calls/?page_size=${pageSize}&page=${page}`, headers);
    if (!res.ok) {
      if (page === 1) throw new Error(`CallTools /calls/ returned HTTP ${res.status}`);
      break;
    }
    const body = res.body as { results?: Array<Record<string, unknown>>; next?: string | null } | null;
    const rows = body?.results ?? [];
    for (const c of rows) {
      const id = String(c["uuid"] ?? c["id"] ?? "");
      if (!id) continue;
      const from = str(c["source"]);
      const to = str(c["destination"]);
      const direction = str(c["call_type"]) ?? (c["inbound"] ? "inbound" : "outbound");
      const lead = direction === "inbound" ? from : to;
      const agentId = str(c["app_user"]) ?? str(c["clicker_agent_id"]);
      out.push({
        provider: "calltools",
        provider_call_id: id,
        agent_name: (agentId ? users.get(agentId) : null) ?? null,
        provider_agent_id: agentId,
        direction,
        from_number: from,
        to_number: to,
        lead_phone_e164: normalizeE164(lead),
        status: str(c["system_disposition"]),
        disposition: str(c["system_disposition"]),
        campaign: str(c["campaign_name"]) ?? str(c["campaign"]),
        buyer: null,
        publisher: null,
        state_code: str(c["state"]),
        talk_seconds: num(c["billsec"]) ?? num(c["duration"]) ?? 0,
        revenue: null,
        payout: null,
        // No recording-download endpoint is exposed on this account; the file id is kept in `raw`.
        recording_url: str(c["recording_url"]),
        started_at: str(c["start"]) ?? str(c["created_on"]),
        ended_at: str(c["end"]),
        raw: c as Json,
      });
    }
    if (!body?.next || rows.length === 0) break;
  }
  return out;
}

/** CallGrid calls are tracked inbound traffic from publishers/campaigns. */
export async function fetchCallGridCalls(maxItems = 200): Promise<NormalizedCall[]> {
  const key = process.env["CALLGRID_API_KEY"];
  if (!key) throw new Error("CALLGRID_API_KEY is not configured");
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  const res = await getJson(`${callGridBase()}/api/call?useCursor=true&maxItems=${maxItems}`, headers);
  if (!res.ok) throw new Error(`CallGrid /api/call returned HTTP ${res.status}`);
  const body = res.body as { data?: Array<Record<string, unknown>> } | null;

  return (body?.data ?? []).flatMap((c) => {
    const id = String(c["id"] ?? c["CallId"] ?? "");
    if (!id) return [];
    const from = str(c["CallerId"]) ?? str(c["InboundNumber"]);
    const to = str(c["VariablePhone"]) ?? str(c["SourceNumber"]);
    return [
      {
        provider: "callgrid" as const,
        provider_call_id: id,
        agent_name: str(c["BuyerName"]) ?? str(c["DestinationName"]),
        provider_agent_id: str(c["DestinationId"]) ?? str(c["BuyerId"]),
        direction: "inbound",
        from_number: from,
        to_number: to,
        lead_phone_e164: normalizeE164(from),
        status: str(c["callStatus"]) ?? str(c["outcome"]),
        disposition: str(c["outcome"]),
        campaign: str(c["CampaignName"]),
        buyer: str(c["BuyerName"]) ?? str(c["DestinationName"]),
        publisher: str(c["VendorName"]) ?? str(c["SourceName"]),
        state_code: str(c["InboundStateCode"]) ?? str(c["InboundState"]),
        talk_seconds: num(c["callDuration"]) ?? 0,
        revenue: num(c["revenue"]),
        payout: num(c["payout"]),
        recording_url: str(c["callRecordingUrl"]),
        started_at: str(c["UTCISODate"]) ?? str(c["createdAt"]),
        ended_at: null,
        raw: c as Json,
      },
    ];
  });
}

/* ---------------------------------------------------------------- persistence */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Upserts normalised calls; safe to re-run because it keys on (provider, provider_call_id). */
async function upsertCalls(calls: NormalizedCall[]) {
  const db = await admin();
  if (calls.length === 0) return { inserted: 0, phones: [] as string[] };

  // Resolve provider agents -> CRM users so agents can read their own rows.
  const agentKeys = new Map<string, { provider: Provider; id: string; name: string | null }>();
  for (const c of calls) {
    if (c.provider_agent_id) {
      agentKeys.set(`${c.provider}:${c.provider_agent_id}`, {
        provider: c.provider,
        id: c.provider_agent_id,
        name: c.agent_name,
      });
    }
  }
  if (agentKeys.size > 0) {
    await db.from("telephony_agents").upsert(
      [...agentKeys.values()].map((a) => ({
        provider: a.provider,
        provider_agent_id: a.id,
        provider_agent_name: a.name,
      })),
      { onConflict: "provider,provider_agent_id", ignoreDuplicates: true },
    );
  }
  const { data: agentRows } = await db.from("telephony_agents").select("id, provider, provider_agent_id, user_id");
  const agentIndex = new Map(
    (agentRows ?? []).map((a) => [`${a.provider}:${a.provider_agent_id}`, a] as const),
  );

  // Providers can return the same call twice in one page; a single upsert may not
  // touch the same conflict key twice, so keep the last copy of each call only.
  const deduped = [...new Map(calls.map((c) => [`${c.provider}:${c.provider_call_id}`, c])).values()];

  const rows = deduped.map((c) => {
    const agent = c.provider_agent_id ? agentIndex.get(`${c.provider}:${c.provider_agent_id}`) : undefined;
    return {
      provider: c.provider,
      provider_call_id: c.provider_call_id,
      agent_id: agent?.id ?? null,
      agent_user_id: agent?.user_id ?? null,
      agent_name: c.agent_name,
      direction: c.direction,
      from_number: c.from_number,
      to_number: c.to_number,
      lead_phone_e164: c.lead_phone_e164,
      status: c.status,
      disposition: c.disposition,
      campaign: c.campaign,
      buyer: c.buyer,
      publisher: c.publisher,
      state_code: c.state_code,
      talk_seconds: Math.round(c.talk_seconds),
      revenue: c.revenue,
      payout: c.payout,
      recording_url: c.recording_url,
      started_at: c.started_at,
      ended_at: c.ended_at,
      raw: c.raw,
      synced_at: new Date().toISOString(),
    };
  });

  const { error } = await db
    .from("telephony_calls")
    .upsert(rows, { onConflict: "provider,provider_call_id" });
  if (error) throw new Error(error.message);

  const phones = [...new Set(rows.map((r) => r.lead_phone_e164).filter((p): p is string => Boolean(p)))];
  return { inserted: rows.length, phones };
}

async function recordSyncState(
  provider: Provider,
  resource: string,
  patch: { status: string; error?: string | null; records: number },
) {
  const db = await admin();
  const { data: existing } = await db
    .from("sync_state")
    .select("records_total")
    .eq("provider", provider)
    .eq("resource", resource)
    .maybeSingle();

  await db.from("sync_state").upsert(
    {
      provider,
      resource,
      last_run_at: new Date().toISOString(),
      watermark: new Date().toISOString(),
      last_status: patch.status,
      last_error: patch.error ?? null,
      records_last_run: patch.records,
      records_total: (existing?.records_total ?? 0) + patch.records,
    },
    { onConflict: "provider,resource" },
  );
}

/* ------------------------------------------------------- scrubbing/attribution */

const DEFAULT_WINDOW_DAYS = 30;

function windowDays() {
  const raw = Number(process.env["ATTRIBUTION_WINDOW_DAYS"]);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_WINDOW_DAYS;
}

/**
 * Recomputes journeys from the stored touches (never mutates counters in place),
 * so a re-sync or backfill can't double-count callbacks or sales.
 */
export async function rebuildJourneys(phones: string[]) {
  const db = await admin();
  if (phones.length === 0) return 0;

  const { data: overrides } = await db
    .from("attribution_overrides")
    .select("phone_e164, provider")
    .in("phone_e164", phones);
  const overrideMap = new Map((overrides ?? []).map((o) => [o.phone_e164, o.provider] as const));

  let rebuilt = 0;
  for (const phone of phones) {
    const { data: calls } = await db
      .from("telephony_calls")
      .select("id, provider, direction, started_at, talk_seconds, agent_user_id")
      .eq("lead_phone_e164", phone)
      .order("started_at", { ascending: true });

    const touches = (calls ?? []).filter((c) => c.started_at);
    if (touches.length === 0) continue;

    const first = touches[0]!;
    const last = touches[touches.length - 1]!;
    const inboundCallgrid = touches.filter((c) => c.provider === "callgrid").length;
    const outboundCalltools = touches.filter(
      (c) => c.provider === "calltools" && c.direction !== "inbound",
    ).length;

    // A callback exists when the dialer touched the number after a CallGrid
    // inbound call, inside the attribution window.
    const firstCallgrid = touches.find((c) => c.provider === "callgrid");
    const windowMs = windowDays() * 86400000;
    const callback = Boolean(
      firstCallgrid &&
        touches.some(
          (c) =>
            c.provider === "calltools" &&
            c.direction !== "inbound" &&
            new Date(c.started_at!).getTime() > new Date(firstCallgrid.started_at!).getTime() &&
            new Date(c.started_at!).getTime() - new Date(firstCallgrid.started_at!).getTime() <= windowMs,
        ),
    );

    const connected = touches.find((c) => (c.talk_seconds ?? 0) >= 30);
    const daysToContact = connected
      ? (new Date(connected.started_at!).getTime() - new Date(first.started_at!).getTime()) / 86400000
      : null;

    const { data: journey, error } = await db
      .from("lead_journeys")
      .upsert(
        {
          phone_e164: phone,
          first_touch_provider: first.provider,
          first_touch_at: first.started_at,
          last_touch_provider: last.provider,
          last_touch_at: last.started_at,
          inbound_callgrid_count: inboundCallgrid,
          outbound_calltools_count: outboundCalltools,
          callback_via_calltools: callback,
          total_attempts: touches.length,
          total_talk_seconds: touches.reduce((sum, c) => sum + (c.talk_seconds ?? 0), 0),
          days_to_contact: daysToContact,
          attributed_provider: overrideMap.get(phone) ?? first.provider,
          owner_id: touches.find((c) => c.agent_user_id)?.agent_user_id ?? null,
        },
        { onConflict: "phone_e164" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await db.from("telephony_calls").update({ journey_id: journey.id }).eq("lead_phone_e164", phone);
    await db.from("journey_touches").upsert(
      touches.map((c) => ({
        journey_id: journey.id,
        call_id: c.id,
        provider: c.provider,
        direction: c.direction,
        occurred_at: c.started_at!,
        talk_seconds: c.talk_seconds ?? 0,
      })),
      { onConflict: "journey_id,call_id" },
    );
    rebuilt += 1;
  }
  return rebuilt;
}

/* -------------------------------------------------------------------- the sync */

export interface SyncOutcome {
  provider: Provider;
  status: "success" | "error";
  records: number;
  error: string | null;
}

export async function runSync(options?: { providers?: Provider[]; maxItems?: number }) {
  const providers = options?.providers ?? (["calltools", "callgrid"] as Provider[]);
  const outcomes: SyncOutcome[] = [];
  const phones = new Set<string>();

  for (const provider of providers) {
    try {
      const calls =
        provider === "calltools"
          ? await fetchCallToolsCalls(100, Math.max(1, Math.ceil((options?.maxItems ?? 200) / 100)))
          : await fetchCallGridCalls(options?.maxItems ?? 200);
      const result = await upsertCalls(calls);
      result.phones.forEach((p) => phones.add(p));
      await recordSyncState(provider, "calls", { status: "success", records: result.inserted });
      outcomes.push({ provider, status: "success", records: result.inserted, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await recordSyncState(provider, "calls", { status: "error", error: message, records: 0 });
      outcomes.push({ provider, status: "error", records: 0, error: message });
    }
  }

  const journeys = await rebuildJourneys([...phones]);
  return { outcomes, journeysRebuilt: journeys, phonesTouched: phones.size };
}
