/**
 * Cron entry point that retries queued CallTools writes and refreshes the
 * reference data (dispositions, agent statuses) the desk depends on.
 *
 * Public prefix, so the caller is verified in-handler with the project key.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/calltools-queue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!expected || provided !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const { drainOutbox, syncAgentStatuses } = await import("@/lib/calltools.server");
          const drained = await drainOutbox(50);
          let statuses: unknown = null;
          try {
            statuses = await syncAgentStatuses();
          } catch (err) {
            statuses = { error: err instanceof Error ? err.message : "failed" };
          }
          return Response.json({ ok: true, drained, statuses });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("calltools-queue failed:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
