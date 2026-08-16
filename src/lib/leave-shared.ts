import type { Database } from "@/integrations/supabase/types";

export type LeaveRequestRow = Database["public"]["Tables"]["leave_requests"]["Row"];

export type LeaveType = "PTO" | "Unpaid";
export type LeaveStatus = "Pending" | "Approved" | "Denied" | "Cancelled";

export interface LeaveInput {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface LeaveRangeInput {
  from: string;
  to: string;
}

export interface LeaveDecision {
  id: string;
  status: LeaveStatus;
  note?: string;
}

export const LEAVE_TYPES: LeaveType[] = ["PTO", "Unpaid"];

export function leaveTone(status: string): "warning" | "success" | "danger" | "muted" {
  if (status === "Approved") return "success";
  if (status === "Denied") return "danger";
  if (status === "Cancelled") return "muted";
  return "warning";
}

export function formatDateRange(start: string, end: string) {
  return start === end ? start : `${start} → ${end}`;
}

/** True when the approved leave covers the given YYYY-MM-DD date. */
export function coversDate(row: { start_date: string; end_date: string }, date: string) {
  return row.start_date <= date && row.end_date >= date;
}
