import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error || !data) {
    throw new Error("Forbidden: administrator access required");
  }
}

const integrationInputSchema = z.object({
  id: z.string().uuid().optional(),
  provider: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  direction: z.string().min(1),
  baseUrl: z.string().url().optional().or(z.literal("")),
  authType: z.string().min(1),
  secret: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export const saveIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => integrationInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const secretName = data.secret ? `integration_${data.provider}_secret` : undefined;

    if (data.secret) {
      process.env[secretName as string] = data.secret;
    }

    const row = {
      ...(data.id ? { id: data.id } : {}),
      provider: data.provider,
      name: data.name,
      category: data.category,
      direction: data.direction,
      base_url: data.baseUrl || null,
      auth_type: data.authType,
      secret_name: secretName ?? null,
      config: data.config ?? {},
      enabled: data.enabled ?? true,
      status: "Not Configured",
      created_by: context.userId,
    };

    const { data: saved, error } = await supabaseAdmin
      .from("integrations")
      .upsert(row, { onConflict: "provider" })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return saved;
  });

export const deleteIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("integrations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("integrations")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rotateWebhookToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { randomBytes } = await import("node:crypto");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = randomBytes(24).toString("hex");
    const { error } = await supabaseAdmin
      .from("integrations")
      .update({ webhook_token: token })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { token };
  });

export const testIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: integration, error: fetchError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("id", data.id)
      .single();
    if (fetchError || !integration) throw new Error(fetchError?.message ?? "Integration not found");

    let status = "Error";
    let lastError: string | null = null;
    let response: unknown = null;

    try {
      if (!integration.base_url) throw new Error("No base URL configured");
      const secretName = integration.secret_name as string | null;
      const secret = secretName ? process.env[secretName] : undefined;

      const headers: Record<string, string> = { Accept: "application/json" };
      if (secret) {
        if (integration.auth_type === "bearer") headers["Authorization"] = `Bearer ${secret}`;
        else if (integration.auth_type === "api_key") headers["x-api-key"] = secret;
      }

      const res = await fetch(integration.base_url, { method: "GET", headers, signal: AbortSignal.timeout(8000) });
      status = res.ok ? "Connected" : "Degraded";
      response = { httpStatus: res.status };
      if (!res.ok) lastError = `Health check returned HTTP ${res.status}`;
    } catch (err) {
      status = "Error";
      lastError = err instanceof Error ? err.message : "Unknown error";
    }

    await supabaseAdmin
      .from("integrations")
      .update({
        status,
        last_error: lastError,
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    await supabaseAdmin.from("integration_events").insert({
      integration_id: integration.id,
      provider: integration.provider,
      direction: "outbound",
      event_type: "test_connection",
      status: status === "Connected" ? "success" : "error",
      payload: { triggeredBy: context.userId },
      response,
      error: lastError,
    });

    return { status, lastError };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ name: z.string().min(1), scopes: z.array(z.enum(["read", "write"])).min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { randomBytes, createHash } = await import("node:crypto");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const secret = randomBytes(16).toString("hex");
    const plaintext = `pb_live_${secret}`;
    const keyHash = createHash("sha256").update(plaintext).digest("hex");
    const keyPrefix = plaintext.slice(0, 12);

    const { data: saved, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        name: data.name,
        scopes: data.scopes,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        created_by: context.userId,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { key: saved, plaintext };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const webhookInputSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().url(),
  event: z.string().min(1),
  status: z.string().optional(),
});

export const saveOutboundWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => webhookInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      ...(data.id ? { id: data.id } : {}),
      url: data.url,
      event: data.event,
      status: data.status ?? "Active",
      created_by: context.userId,
    };
    const { data: saved, error } = data.id
      ? await supabaseAdmin.from("outbound_webhooks").update(row).eq("id", data.id).select("*").single()
      : await supabaseAdmin.from("outbound_webhooks").insert(row).select("*").single();
    if (error) throw new Error(error.message);
    return saved;
  });

export const deleteOutboundWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("outbound_webhooks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testOutboundWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: webhook, error: fetchError } = await supabaseAdmin
      .from("outbound_webhooks")
      .select("*")
      .eq("id", data.id)
      .single();
    if (fetchError || !webhook) throw new Error(fetchError?.message ?? "Webhook not found");

    let ok = false;
    let errorMessage: string | null = null;
    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: webhook.event, test: true, sentAt: new Date().toISOString() }),
        signal: AbortSignal.timeout(8000),
      });
      ok = res.ok;
      if (!res.ok) errorMessage = `HTTP ${res.status}`;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Unknown error";
    }

    await supabaseAdmin
      .from("outbound_webhooks")
      .update({
        last_fired_at: new Date().toISOString(),
        failures: ok ? webhook.failures : (webhook.failures ?? 0) + 1,
        status: ok ? "Active" : "Paused",
      })
      .eq("id", data.id);

    return { ok, error: errorMessage };
  });
