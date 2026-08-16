/**
 * Client-safe contracts for Do-Not-Call (DNC) compliance: vocabularies,
 * schemas and small display helpers shared by the UI and server functions.
 */

import { z } from "zod";

export const DNC_REASONS = [
  "Consumer request",
  "Verbal opt-out",
  "Written opt-out",
  "Litigator / risk",
  "Federal DNC registry",
  "State DNC registry",
  "Wrong number",
  "Complaint",
  "Other",
] as const;
export type DncReason = (typeof DNC_REASONS)[number];

export const DNC_SCOPES = ["internal", "federal", "state", "litigator"] as const;
export type DncScope = (typeof DNC_SCOPES)[number];

export const DNC_SOURCES = ["manual", "agent-wrapup", "import", "webhook", "system"] as const;

export const DNC_ACTIONS = ["added", "released", "dial_blocked", "imported", "updated"] as const;
export type DncAction = (typeof DNC_ACTIONS)[number];

export const DNC_ACTION_LABEL: Record<string, string> = {
  added: "Added to DNC",
  released: "Released from DNC",
  dial_blocked: "Dial blocked",
  imported: "Imported",
  updated: "Entry updated",
};

export const DNC_ACTION_TONE: Record<string, string> = {
  added: "bg-destructive/15 text-destructive",
  released: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  dial_blocked: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  imported: "bg-primary/10 text-primary",
  updated: "bg-muted text-muted-foreground",
};

export const DNC_SCOPE_TONE: Record<string, string> = {
  internal: "bg-muted text-muted-foreground",
  federal: "bg-destructive/15 text-destructive",
  state: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  litigator: "bg-destructive/20 text-destructive",
};

const phone = z.string().min(7).max(24);

export const dncAddSchema = z.object({
  phone,
  contactName: z.string().max(120).optional(),
  reason: z.string().min(1).max(120).default("Consumer request"),
  scope: z.enum(DNC_SCOPES).default("internal"),
  source: z.string().max(40).default("manual"),
  notes: z.string().max(1000).optional(),
});
export type DncAddInput = z.infer<typeof dncAddSchema>;

export const dncReleaseSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().max(300).optional(),
});

export const dncBulkSchema = z.object({
  text: z.string().min(3).max(20000),
  reason: z.string().min(1).max(120).default("Import"),
  scope: z.enum(DNC_SCOPES).default("internal"),
});

export const dncListSchema = z.object({
  search: z.string().max(60).optional(),
  scope: z.string().max(20).default("all"),
  status: z.enum(["all", "active", "released"]).default("active"),
  action: z.string().max(20).default("all"),
  days: z.coerce.number().int().min(1).max(365).default(90),
  limit: z.coerce.number().int().min(10).max(500).default(200),
});
export type DncListInput = z.infer<typeof dncListSchema>;

/** Pretty +1 (555) 123-4567 rendering for US numbers, raw otherwise. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "—";
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
