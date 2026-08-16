import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LeaveDecision, LeaveInput, LeaveRangeInput } from "@/lib/leave-shared";

/** Leave requests for the signed-in user, newest first. */
export const getMyLeaveRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", context.userId)
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Every leave request overlapping a date range (visibility enforced by RLS). */
export const getLeaveForRange = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: LeaveRangeInput) => input)
  .handler(async ({ data, context }) => {
    const [{ data: leave, error }, { data: profiles }] = await Promise.all([
      context.supabase
        .from("leave_requests")
        .select("*")
        .lte("start_date", data.to)
        .gte("end_date", data.from)
        .order("start_date", { ascending: false }),
      context.supabase.from("profiles").select("id, name, team, avatar_initials"),
    ]);
    if (error) throw new Error(error.message);
    return { leave: leave ?? [], profiles: profiles ?? [] };
  });

/** Submits a new leave request for the signed-in user. */
export const submitLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: LeaveInput) => input)
  .handler(async ({ data, context }) => {
    const start = new Date(`${data.start_date}T00:00:00Z`);
    const end = new Date(`${data.end_date}T00:00:00Z`);
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start) {
      throw new Error("Please pick a valid start and end date.");
    }
    const days = Math.round((end.valueOf() - start.valueOf()) / 86_400_000) + 1;

    const { data: row, error } = await context.supabase
      .from("leave_requests")
      .insert({
        user_id: context.userId,
        leave_type: data.leave_type,
        start_date: data.start_date,
        end_date: data.end_date,
        days,
        reason: data.reason ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Approve, deny or cancel a request. Reviewers need ops/HR access (enforced by RLS). */
export const decideLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: LeaveDecision) => input)
  .handler(async ({ data, context }) => {
    const patch =
      data.status === "Cancelled"
        ? { status: "Cancelled" as const }
        : {
            status: data.status,
            reviewed_by: context.userId,
            reviewed_at: new Date().toISOString(),
            review_note: data.note ?? null,
          };

    const { data: row, error } = await context.supabase
      .from("leave_requests")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
