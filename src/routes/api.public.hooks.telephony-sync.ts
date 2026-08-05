/**
 * Cron / webhook entry point for the telephony sync engine.
 *
 * Called by the scheduler (or manually) to pull CallTools + CallGrid records and
 * rebuild lead journeys. Public prefix, so the caller is verified in-handler with
 * the project's publishable key.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/telephony-sync")({
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

        let maxItems = 200;
        try {
          const body = (await request.json()) as { maxItems?: number };
          if (typeof body?.maxItems === "number") maxItems = Math.min(Math.max(body.maxItems, 20), 2000);
        } catch {
          /* empty body is fine */
        }

        try {
          const { runSync } = await import("@/lib/telephony.server");
          const result = await runSync({ maxItems });
          return Response.json({ ok: true, ...result });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("telephony-sync failed:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
