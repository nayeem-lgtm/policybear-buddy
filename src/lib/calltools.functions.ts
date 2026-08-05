import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const DEFAULT_BASE_URL = "https://west-2.calltools.io/api";
const PROVIDER = "calltools";

/** CallTools accounts are hosted per-company, so the base URL is configurable. */
function baseUrl() {
  return (process.env["CALLTOOLS_BASE_URL"] || DEFAULT_BASE_URL).replace(/\/$/, "");
}


function authHeaders(key: string): Record<string, string> {
  return { Authorization: `Token ${key}`, Accept: "application/json" };
}

async function callTools(path: string, key: string, init?: RequestInit) {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { ...authHeaders(key), ...(init?.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(12000),
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

/** Current CallTools connection state (row + whether the API key secret is present). */
export const getCallToolsStatus = createServerFn({ method: "GET" })
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
      keyConfigured: Boolean(process.env["CALLTOOLS_API_KEY"]),
      baseUrl: baseUrl(),
      integration: data ?? null,
    };
  });

/** Live health check against CallTools; persists status on the integrations row. */
export const testCallTools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOps(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = process.env["CALLTOOLS_API_KEY"];

    let status = "Error";
    let lastError: string | null = null;
    let response: unknown = null;

    if (!key) {
      lastError = "CALLTOOLS_API_KEY is not configured";
    } else {
      try {
        // Probe a few lightweight endpoints; the first authenticated 2xx wins.
        for (const path of ["/users/?page_size=1", "/campaigns/?page_size=1", "/calls/?page_size=1"]) {
          const result = await callTools(path, key);
          response = { path, httpStatus: result.status };
          if (result.ok) {
            status = "Connected";
            lastError = null;
            break;
          }
          if (result.status === 401 || result.status === 403) {
            status = "Error";
            lastError = `Authentication rejected (HTTP ${result.status})`;
            break;
          }
          status = "Degraded";
          lastError = `HTTP ${result.status} from ${path}`;
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
          name: "CallTools",
          category: "Dialer / Telephony",
          direction: "bidirectional",
          base_url: baseUrl(),
          auth_type: "token",
          secret_name: "CALLTOOLS_API_KEY",
          enabled: true,
          status,
          last_error: lastError,
          last_sync_at: new Date().toISOString(),
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

/** Read-through proxy for CallTools GET endpoints (campaigns, calls, agents, ...). */
export const callToolsFetch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        path: z.string().regex(/^\/[A-Za-z0-9_\-/?=&.]*$/, "Invalid CallTools path"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertOps(context);
    const key = process.env["CALLTOOLS_API_KEY"];
    if (!key) throw new Error("CALLTOOLS_API_KEY is not configured");
    const result = await callTools(data.path, key);
    if (!result.ok) throw new Error(`CallTools returned HTTP ${result.status}`);
    return { data: result.body as Json };

  });

type CountResult = { count: number | null; error: string | null };

async function countOf(path: string, key: string): Promise<CountResult> {
  try {
    const res = await callTools(`${path}?page_size=1`, key);
    if (!res.ok) return { count: null, error: `HTTP ${res.status}` };
    const body = res.body as { count?: number } | null;
    return { count: typeof body?.count === "number" ? body.count : null, error: null };
  } catch (err) {
    return { count: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/** Live CallTools account overview: record counts plus the most recent calls. */
export const getCallToolsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOps(context);
    const key = process.env["CALLTOOLS_API_KEY"];
    if (!key) throw new Error("CALLTOOLS_API_KEY is not configured");

    const [users, campaigns, calls, contacts, sms] = await Promise.all([
      countOf("/users/", key),
      countOf("/campaigns/", key),
      countOf("/calls/", key),
      countOf("/contacts/", key),
      countOf("/sms/", key),
    ]);

    let recentCalls: Array<{
      id: string;
      direction: string | null;
      status: string | null;
      from: string | null;
      to: string | null;
      duration: number | null;
      startedAt: string | null;
    }> = [];

    try {
      const res = await callTools("/calls/?page_size=10", key);
      const body = res.body as { results?: Array<Record<string, unknown>> } | null;
      recentCalls = (body?.results ?? []).map((c) => ({
        id: String(c["uuid"] ?? c["id"] ?? ""),
        direction: (c["call_type"] as string) ?? (c["inbound"] ? "inbound" : "outbound"),
        status: (c["system_disposition"] as string) ?? null,
        from: (c["source"] as string) ?? null,
        to: (c["destination"] as string) ?? null,
        duration: typeof c["billsec"] === "number" ? (c["billsec"] as number) : typeof c["duration"] === "number" ? (c["duration"] as number) : null,
        startedAt: (c["start"] as string) ?? (c["created_on"] as string) ?? null,
      }));
    } catch {
      /* counts still useful without the call list */
    }

    return {
      counts: { users, campaigns, calls, contacts, sms },
      recentCalls,
    };
  });
