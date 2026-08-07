import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  bucketColumnFor,
  overrunColumnFor,
  pacificDate,
  type ShiftDay,
  type ShiftEventRow,
  type ShiftSessionUpdate,
  type ShiftSessionRow,
} from "@/lib/shift-shared";

/** Opens (or reuses) today's shift session for the signed-in user. */
export const startShiftSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { detail?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const workDate = pacificDate();

    const { data: existing } = await supabase
      .from("shift_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("work_date", workDate)
      .maybeSingle();

    if (existing && !existing.signed_out_at) return existing as ShiftSessionRow;

    if (existing?.signed_out_at) {
      // Re-opening the same day (came back after signing out).
      const { data: reopened, error } = await supabase
        .from("shift_sessions")
        .update({
          signed_out_at: null,
          auto_closed: false,
          current_status: "Available",
          current_status_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await supabase.from("shift_status_events").insert({
        session_id: existing.id,
        user_id: userId,
        status: "Available",
        detail: data.detail ?? "Signed back in",
      });
      return reopened as ShiftSessionRow;
    }

    const { data: created, error } = await supabase
      .from("shift_sessions")
      .insert({ user_id: userId, work_date: workDate })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("shift_status_events").insert({
      session_id: created.id,
      user_id: userId,
      status: "Available",
      detail: data.detail ?? "Signed in",
    });

    return created as ShiftSessionRow;
  });

/**
 * Records a presence change: closes the running status event, adds its elapsed
 * time to the right daily bucket, and opens the next one.
 */
export const recordStatusChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      status: string;
      detail?: string;
      allowanceSeconds?: number | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const workDate = pacificDate();
    const now = new Date();

    const { data: session } = await supabase
      .from("shift_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("work_date", workDate)
      .maybeSingle();
    if (!session) return null;

    const { data: openEvent } = await supabase
      .from("shift_status_events")
      .select("*")
      .eq("session_id", session.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const numbers = session as unknown as Record<string, number>;
    const patch: ShiftSessionUpdate = {
      current_status: data.status,
      current_status_at: now.toISOString(),
    };

    if (openEvent) {
      const elapsed = Math.max(
        0,
        Math.round((now.getTime() - new Date(openEvent.started_at).getTime()) / 1000),
      );
      const allowance = openEvent.allowance_seconds;
      const overrun = allowance ? Math.max(0, elapsed - allowance) : 0;

      await supabase
        .from("shift_status_events")
        .update({
          ended_at: now.toISOString(),
          duration_seconds: elapsed,
          overrun_seconds: overrun,
        })
        .eq("id", openEvent.id);

      const bucket = bucketColumnFor(openEvent.status);
      if (bucket) {
        patch[bucket] = (numbers[bucket] ?? 0) + elapsed;
      }
      const overrunColumn = overrunColumnFor(openEvent.status);
      if (overrunColumn && overrun > 0) {
        patch[overrunColumn] = (numbers[overrunColumn] ?? 0) + overrun;
      }
    }

    if (data.status === "Break") patch.break_count = (session.break_count ?? 0) + 1;
    if (data.status === "Lunch") patch.lunch_count = (session.lunch_count ?? 0) + 1;
    if (data.status === "Signed Out") patch.signed_out_at = now.toISOString();

    await supabase.from("shift_sessions").update(patch).eq("id", session.id);


    if (data.status !== "Signed Out") {
      await supabase.from("shift_status_events").insert({
        session_id: session.id,
        user_id: userId,
        status: data.status,
        detail: data.detail ?? null,
        allowance_seconds: data.allowanceSeconds ?? null,
        started_at: now.toISOString(),
      });
    }

    const { data: fresh } = await supabase
      .from("shift_sessions")
      .select("*")
      .eq("id", session.id)
      .maybeSingle();
    return (fresh ?? null) as ShiftSessionRow | null;
  });

/** Keeps `current_status_at` fresh so an abandoned session auto-closes at the last activity. */
export const shiftHeartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("shift_sessions")
      .update({ current_status_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("work_date", pacificDate())
      .is("signed_out_at", null);
    return { ok: true };
  });

/** Today's session plus its full event timeline for the signed-in user. */
export const getMyShiftDay = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ShiftDay> => {
    const { supabase, userId } = context;
    await supabase.rpc("shift_close_stale_sessions", { _max_hours: 14 });

    const { data: session } = await supabase
      .from("shift_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("work_date", pacificDate())
      .maybeSingle();

    if (!session) return { session: null, events: [], week: [] };

    const { data: events } = await supabase
      .from("shift_status_events")
      .select("*")
      .eq("session_id", session.id)
      .order("started_at", { ascending: true });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const { data: week } = await supabase
      .from("shift_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("work_date", pacificDate(weekStart))
      .order("work_date", { ascending: true });

    return {
      session: session as ShiftSessionRow,
      events: (events ?? []) as ShiftEventRow[],
      week: (week ?? []) as ShiftSessionRow[],
    };
  });

/** HR / Operations view: every employee's shift totals for a date range. */
export const getAttendanceRegister = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from?: string; to?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await supabase.rpc("shift_close_stale_sessions", { _max_hours: 14 });

    const to = data.to ?? pacificDate();
    const fromDefault = new Date();
    fromDefault.setDate(fromDefault.getDate() - 30);
    const from = data.from ?? pacificDate(fromDefault);

    const [{ data: sessions }, { data: profiles }] = await Promise.all([
      supabase
        .from("shift_sessions")
        .select("*")
        .gte("work_date", from)
        .lte("work_date", to)
        .order("work_date", { ascending: false }),
      supabase.from("profiles").select("id, name, email, team, department, title, avatar_initials"),
    ]);

    return {
      from,
      to,
      sessions: (sessions ?? []) as ShiftSessionRow[],
      profiles: profiles ?? [],
    };
  });
