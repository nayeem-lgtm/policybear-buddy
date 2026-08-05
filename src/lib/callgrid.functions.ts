import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const DEFAULT_BASE_URL = "https://api.callgrid.com";
const PROVIDER = "callgrid";

/** CallGrid API host (configurable in case the org is on a regional host). */
function baseUrl() {
  return (process.env["CALLGRID_BASE_URL"] || DEFAULT_BASE_URL).replace(/\/$/, "");
}

type AuthScheme = "bearer" | "api_key" | "token";

function authHeaders(key: string, scheme: AuthScheme): Record<string, string> {
  const base: Record<string, string> = { Accept: "application/json" };
  if (scheme === "bearer") base["Authorization"] = `Bearer ${key}`;
  else if (scheme === "token") base["Authorization"] = `Token ${key}`;
  else base["X-API-Key"] = key;
  return base;
}

async function callGrid(path: string, key: string, scheme: AuthScheme, init?: RequestInit) {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { ...authHeaders(key, scheme), ...(init?.headers as Record<string, string> | undefined) },
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

/** Candidate resource paths probed during discovery, in priority order. */
const CANDIDATE_PATHS = [
  "/api/v1/me",
  "/api/v1/account",
  "/api/v1/organization",
  "/api/v1/users",
  "/api/v1/calls",
  "/v1/me",
  "/v1/calls",
  "/me",
  "/calls",
];

const SCHEMES: AuthScheme[] = ["bearer", "api_key", "token"];

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

/**
 * Live health check against CallGrid. Confirms the host is reachable, then probes
 * candidate resource paths across auth schemes and remembers whichever authenticates.
 */
export const testCallGrid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOps(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = process.env["CALLGRID_API_KEY"];

    let status = "Error";
    let lastError: string | null = null;
    let response: unknown = null;
    let workingPath: string | null = null;
    let workingScheme: AuthScheme | null = null;
    const probes: Array<{ path: string; scheme: AuthScheme; httpStatus: number }> = [];

    if (!key) {
      lastError = "CALLGRID_API_KEY is not configured";
    } else {
      try {
        // 1) Host reachability.
        const health = await callGrid("/health", key, "bearer");
        if (health.ok) {
          status = "Degraded";
          lastError = "Host reachable, but no authenticated resource endpoint found yet";
        }

        // 2) Find a resource endpoint that accepts the key.
        outer: for (const path of CANDIDATE_PATHS) {
          for (const scheme of SCHEMES) {
            const result = await callGrid(path, key, scheme);
            probes.push({ path, scheme, httpStatus: result.status });
            if (result.ok) {
              status = "Connected";
              lastError = null;
              workingPath = path;
              workingScheme = scheme;
              response = { path, scheme, httpStatus: result.status };
              break outer;
            }
            if (result.status === 401 || result.status === 403) {
              status = "Error";
              lastError = `Authentication rejected on ${path} (HTTP ${result.status})`;
            }
          }
        }
        if (!response) response = { probes: probes.slice(0, 12), health: health.status };
      } catch (err) {
        status = "Error";
        lastError = err instanceof Error ? err.message : "Unknown error";
      }
    }

    const { data: saved, error } = await supabaseAdmin
      .from("integrations")
      .upsert(
        {
          provider: PROVIDER,
          name: "CallGrid",
          category: "Dialer / Telephony",
          direction: "bidirectional",
          base_url: baseUrl(),
          auth_type: workingScheme ?? "bearer",
          secret_name: "CALLGRID_API_KEY",
          enabled: true,
          status,
          last_error: lastError,
          last_sync_at: new Date().toISOString(),
          config: {
            consoleUrl: "https://app.callgrid.com/organization/api-keys",
            resourcePath: workingPath,
            authScheme: workingScheme,
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

    return { status, lastError, workingPath, workingScheme, probes, integration: saved };
  });

/** Read-through proxy for CallGrid GET endpoints, using the discovered auth scheme. */
export const callGridFetch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        path: z.string().regex(/^\/[A-Za-z0-9_\-/?=&.]*$/, "Invalid CallGrid path"),
        scheme: z.enum(["bearer", "api_key", "token"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertOps(context);
    const key = process.env["CALLGRID_API_KEY"];
    if (!key) throw new Error("CALLGRID_API_KEY is not configured");

    let scheme: AuthScheme = data.scheme ?? "bearer";
    if (!data.scheme) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row } = await supabaseAdmin
        .from("integrations")
        .select("config")
        .eq("provider", PROVIDER)
        .maybeSingle();
      const stored = (row?.config as { authScheme?: AuthScheme } | null)?.authScheme;
      if (stored) scheme = stored;
    }

    const result = await callGrid(data.path, key, scheme);
    if (!result.ok) throw new Error(`CallGrid returned HTTP ${result.status}`);
    return { data: result.body as Json };
  });
