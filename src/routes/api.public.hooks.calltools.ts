/**
 * Real-time CallTools receiver (rest hook subscriptions).
 *
 * CallTools posts here whenever a call starts, ends, gets a disposition, or an
 * agent changes status. The caller is verified with the per-project webhook
 * token stored on the telephony settings row, and the handler always answers
 * 200 for verified callers so CallTools does not disable the subscription.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/calltools")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, service: "calltools-hook" }),
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token =
          url.searchParams.get("token") ?? request.headers.get("x-webhook-token") ?? "";

        const raw = await request.text();
        let payload: Record<string, unknown> = {};
        try {
          payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        try {
          const { getSettings, applyWebhookEvent } = await import("@/lib/calltools.server");
          const settings = await getSettings();

          if (!token || token !== settings.webhook_token) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          if (!settings.webhooks_enabled) {
            return Response.json({ ok: true, ignored: "webhooks disabled" });
          }

          const event =
            (payload["event"] as string) ??
            (payload["event_type"] as string) ??
            url.searchParams.get("event") ??
            "call.updated";
          const body = (payload["data"] as Record<string, unknown>) ?? payload;

          const result = await applyWebhookEvent(event, body);
          return Response.json({ ok: true, event, ...result });
        } catch (err) {
          console.error("calltools hook failed:", err instanceof Error ? err.message : err);
          // Answer 200 so CallTools keeps the subscription alive; we log our side.
          return Response.json({ ok: false });
        }
      },
    },
  },
});
