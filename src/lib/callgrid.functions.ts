import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const DEFAULT_BASE_URL = "https://api.callgrid.com";
const PROVIDER = "callgrid";

function baseUrl() {
  return (process.env["CALLGRID_BASE_URL"] || DEFAULT_BASE_URL).replace(/\/$/, "");
}

/** CallGrid authenticates server-to-server with a Bearer API key. */
async function callGrid(path: string, key: string, init?: RequestInit) {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep raw text */
  }
  return { ok: res.ok, status: res.status, body };
}

async function assertOps(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_ops", { _user_id: context.userId });
  if (error || !data) throw new Error("Forbidden: operations access required");
}

function apiKey() {
  const key = process.env["CALLGRID_API_KEY"];
  if (!key) throw new Error("CALLGRID_API_KEY is not configured");
  return key;
}

/** Current CallGrid connection state (row + whether the API key secret is present). */
export const getCallGridStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOps(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("provider", PROVIDER)
      .maybeSingle();

    return {
      keyConfigured: Boolean(process.env["CALLGRID_API_KEY"]),
      baseUrl: baseUrl(),
      integration: data ?? null,
    };
  });

/** Live health check against CallGrid; persists status on the integrations row. */
export const testCallGrid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOps(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = process.env["CALLGRID_API_KEY"];

    let status = "Error";
    let lastError: string | null = null;
    let response: unknown = null;

    if (!key) {
      lastError = "CALLGRID_API_KEY is not configured";
    } else {
      try {
        const result = await callGrid("/api/campaign?page=1&limit=1", key);
        response = { path: "/api/campaign", httpStatus: result.status };
        if (result.ok) {
          status = "Connected";
        } else if (result.status === 401 || result.status === 403) {
          lastError = `Authentication rejected (HTTP ${result.status})`;
        } else {
          status = "Degraded";
          lastError = `HTTP ${result.status} from /api/campaign`;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
      }
    }

    const { data: saved, error } = await supabaseAdmin
      .from("integrations")
      .upsert(
        {
          provider: PROVIDER,
          name: "CallGrid",
          category: "Call Tracking / Routing",
          direction: "bidirectional",
          base_url: baseUrl(),
          auth_type: "bearer",
          secret_name: "CALLGRID_API_KEY",
          enabled: true,
          status,
          last_error: lastError,
          last_sync_at: new Date().toISOString(),
          config: {
            consoleUrl: "https://app.callgrid.com/organization/api-keys",
            docsUrl: "https://callgrid.com/api",
            endpoints: ["/api/call", "/api/campaign", "/api/destination", "/api/buyer", "/api/webhook", "/api/tag", "/api/organization"],
          } as Json,
          created_by: context.userId,
        },
        { onConflict: "provider" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("integration_events").insert({
      integration_id: saved.id,
      provider: PROVIDER,
      direction: "outbound",
      event_type: "test_connection",
      status: status === "Connected" ? "success" : "error",
      payload: { triggeredBy: context.userId } as Json,
      response: response as Json,
      error: lastError,
    });

    return { status, lastError, integration: saved };
  });

/** Read-through proxy for CallGrid GET endpoints. */
export const callGridFetch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({ path: z.string().regex(/^\/api\/[A-Za-z0-9_\-/?=&.%+]*$/, "Invalid CallGrid path") })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertOps(context);
    const result = await callGrid(data.path, apiKey());
    if (!result.ok) throw new Error(`CallGrid returned HTTP ${result.status}`);
    return { data: result.body as Json };
  });

type CountResult = { count: number | null; error: string | null };

/** Page-based endpoints return { data, totalPages, counts: { all } }. */
async function countOf(path: string, key: string): Promise<CountResult> {
  try {
    const res = await callGrid(`${path}?page=1&limit=1`, key);
    if (!res.ok) return { count: null, error: `HTTP ${res.status}` };
    const body = res.body as
      | { totalCount?: number; totalPages?: number; counts?: { all?: number }; data?: unknown[] }
      | null;
    const count =
      typeof body?.counts?.all === "number"
        ? body.counts.all
        : typeof body?.totalCount === "number"
          ? body.totalCount
          : // limit=1, so one page per record.
            typeof body?.totalPages === "number"
            ? body.totalPages
            : (body?.data?.length ?? null);
    return { count, error: null };
  } catch (err) {
    return { count: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}


/** Live CallGrid overview: record counts plus the most recent tracked calls. */
export const getCallGridOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOps(context);
    const key = apiKey();

    const [campaigns, destinations, buyers, webhooks, tags] = await Promise.all([
      countOf("/api/campaign", key),
      countOf("/api/destination", key),
      countOf("/api/buyer", key),
      countOf("/api/webhook", key),
      countOf("/api/tag", key),
    ]);

    let calls: CountResult = { count: null, error: null };
    let recentCalls: Array<{
      id: string;
      from: string | null;
      to: string | null;
      campaign: string | null;
      buyer: string | null;
      publisher: string | null;
      state: string | null;
      status: string | null;
      duration: number | null;
      revenue: number | null;
      payout: number | null;
      recordingUrl: string | null;
      startedAt: string | null;
    }> = [];

    try {
      // The calls endpoint uses cursor pagination.
      const res = await callGrid("/api/call?useCursor=true&maxItems=15", key);
      const body = res.body as
        | { data?: Array<Record<string, unknown>>; totalCount?: number }
        | null;
      if (!res.ok) {
        calls = { count: null, error: `HTTP ${res.status}` };
      } else {
        calls = { count: typeof body?.totalCount === "number" ? body.totalCount : null, error: null };
        const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);
        const num = (v: unknown) => (typeof v === "number" ? v : null);
        recentCalls = (body?.data ?? []).map((c) => ({
          id: String(c["id"] ?? c["CallId"] ?? ""),
          from: str(c["CallerId"]) ?? str(c["InboundNumber"]),
          to: str(c["VariablePhone"]) ?? str(c["SourceNumber"]),
          campaign: str(c["CampaignName"]),
          buyer: str(c["BuyerName"]) ?? str(c["DestinationName"]),
          publisher: str(c["VendorName"]) ?? str(c["SourceName"]),
          state: str(c["InboundStateCode"]) ?? str(c["InboundState"]),
          status: str(c["callStatus"]) ?? str(c["outcome"]),
          duration: num(c["callDuration"]),
          revenue: num(c["revenue"]),
          payout: num(c["payout"]),
          recordingUrl: str(c["callRecordingUrl"]),
          startedAt: str(c["UTCISODate"]) ?? str(c["createdAt"]),
        }));
      }
    } catch (err) {
      calls = { count: null, error: err instanceof Error ? err.message : "Unknown error" };
    }

    return {
      counts: { calls, campaigns, destinations, buyers, webhooks, tags },
      recentCalls,
    };
  });
