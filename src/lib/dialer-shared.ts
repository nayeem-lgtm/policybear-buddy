/**
 * Client-safe contracts for the real-time dialer: statuses, dispositions,
 * routing vocabulary and the zod schemas shared by the UI and server fns.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ vocabulary */

export const CALL_STATES = [
  "queued",
  "ringing",
  "connected",
  "hold",
  "wrap",
  "ended",
] as const;
export type CallState = (typeof CALL_STATES)[number];

export const CALLBACK_STATUSES = [
  "Pending",
  "Scheduled",
  "Calling",
  "Connected",
  "No Answer",
  "Busy",
  "Failed",
  "Completed",
  "Cancelled",
] as const;
export type CallbackStatus = (typeof CALLBACK_STATUSES)[number];

export const DISPOSITIONS = [
  "Interested",
  "Not Interested",
  "Qualified",
  "Sold",
  "Existing Customer",
  "Wrong Number",
  "No Answer",
  "DNC",
  "Invalid Lead",
  "Follow-up Required",
] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

/** Dispositions that should keep the lead in the working set. */
export const RETRY_DISPOSITIONS: readonly string[] = ["No Answer", "Follow-up Required", "Interested"];
/** Dispositions that close a lead out permanently. */
export const CLOSING_DISPOSITIONS: readonly string[] = [
  "Sold",
  "Not Interested",
  "DNC",
  "Invalid Lead",
  "Wrong Number",
  "Existing Customer",
];

export const DIALER_MODES = ["manual", "preview", "power", "predictive"] as const;
export type DialerMode = (typeof DIALER_MODES)[number];

export const QUEUE_STRATEGIES = [
  "longest_idle",
  "round_robin",
  "skill_priority",
  "ring_all",
] as const;

export const OVERFLOW_ACTIONS = ["voicemail", "callback", "forward", "hangup"] as const;
export const AFTER_HOURS_ACTIONS = ["voicemail", "callback", "forward", "menu", "hangup"] as const;
export const IVR_ACTIONS = ["queue", "menu", "forward", "voicemail", "callback", "hangup"] as const;

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/* --------------------------------------------------------------------- schemas */

const phone = z.string().min(7).max(24);

export const startCallSchema = z.object({
  phone,
  contactName: z.string().max(120).optional(),
  contactId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  dialTaskId: z.string().uuid().optional(),
  callbackId: z.string().uuid().optional(),
  fromNumberId: z.string().uuid().optional(),
  queueId: z.string().uuid().optional(),
  mode: z.enum(DIALER_MODES).default("manual"),
});
export type StartCallInput = z.infer<typeof startCallSchema>;

export const callActionSchema = z.object({
  callId: z.string().uuid(),
  action: z.enum(["answer", "hold", "resume", "mute", "unmute", "hangup", "transfer"]),
  transferTo: z.string().max(60).optional(),
});

export const wrapCallSchema = z.object({
  callId: z.string().uuid(),
  disposition: z.enum(DISPOSITIONS),
  notes: z.string().max(2000).optional(),
  callbackAt: z.string().max(40).optional(),
  callbackReason: z.string().max(200).optional(),
});

export const callbackSchema = z.object({
  phone,
  contactName: z.string().max(120).optional(),
  contactId: z.string().uuid().optional(),
  reason: z.string().min(1).max(200),
  detail: z.string().max(1000).optional(),
  scheduledAt: z.string().max(40).optional(),
  queueId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
});

export const callbackUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(CALLBACK_STATUSES).optional(),
  scheduledAt: z.string().max(40).nullable().optional(),
  assignToMe: z.boolean().optional(),
  assignTo: z.string().uuid().nullable().optional(),

  notes: z.string().max(1000).optional(),
});

export const phoneNumberSchema = z.object({
  id: z.string().uuid().optional(),
  e164: phone,
  label: z.string().min(1).max(80),
  provider: z.string().max(40).default("calltools"),
  kind: z.enum(["inbound", "outbound", "both"]).default("inbound"),
  ivrMenuId: z.string().uuid().nullable().optional(),
  queueId: z.string().uuid().nullable().optional(),
  businessHoursId: z.string().uuid().nullable().optional(),
  afterHoursAction: z.enum(AFTER_HOURS_ACTIONS).default("voicemail"),
  afterHoursTarget: z.string().max(80).nullable().optional(),
  recordCalls: z.boolean().default(true),
  smsEnabled: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const queueSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(300).nullable().optional(),
  strategy: z.enum(QUEUE_STRATEGIES).default("longest_idle"),
  priority: z.coerce.number().int().min(1).max(10).default(1),
  maxWaitSeconds: z.coerce.number().int().min(30).max(3600).default(300),
  wrapSeconds: z.coerce.number().int().min(0).max(600).default(20),
  ringSeconds: z.coerce.number().int().min(5).max(120).default(20),
  overflowAction: z.enum(OVERFLOW_ACTIONS).default("voicemail"),
  overflowTarget: z.string().max(80).nullable().optional(),
  announcePosition: z.boolean().default(true),
  active: z.boolean().default(true),
});

export const ivrOptionSchema = z.object({
  digit: z.string().min(1).max(1),
  label: z.string().min(1).max(80),
  action: z.enum(IVR_ACTIONS),
  target: z.string().max(80).nullable().optional(),
});
export type IvrOption = z.infer<typeof ivrOptionSchema>;

export const ivrMenuSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  greeting: z.string().max(600).default(""),
  options: z.array(ivrOptionSchema).max(10).default([]),
  timeoutSeconds: z.coerce.number().int().min(3).max(60).default(8),
  invalidMessage: z.string().max(200).default("Sorry, that is not a valid option."),
  maxRetries: z.coerce.number().int().min(0).max(5).default(2),
  active: z.boolean().default(true),
});

export const dayHoursSchema = z
  .object({ open: z.string().max(5), close: z.string().max(5) })
  .nullable();

export const businessHoursSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  timezone: z.string().max(60).default("America/Los_Angeles"),
  schedule: z.record(z.enum(WEEKDAYS), dayHoursSchema),
  holidays: z.array(z.string().max(20)).max(60).default([]),
});

export const campaignSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  mode: z.enum(DIALER_MODES).default("power"),
  pacing: z.coerce.number().min(1).max(4).default(1),
  callerId: z.string().max(24).nullable().optional(),
  queueId: z.string().uuid().nullable().optional(),
  maxAttempts: z.coerce.number().int().min(1).max(12).default(4),
  retryMinutes: z.coerce.number().int().min(5).max(10080).default(120),
  callingWindowStart: z.string().max(5).default("08:00"),
  callingWindowEnd: z.string().max(5).default("19:00"),
  active: z.boolean().default(true),
});

export const dialTaskSchema = z.object({
  campaignId: z.string().uuid(),
  leads: z
    .array(
      z.object({
        phone,
        contactName: z.string().max(120).optional(),
        state: z.string().max(4).optional(),
      }),
    )
    .min(1)
    .max(500),
});

/* --------------------------------------------------------------------- helpers */

export const CALLBACK_STATUS_TONE: Record<CallbackStatus, string> = {
  Pending: "bg-muted text-muted-foreground",
  Scheduled: "bg-primary/10 text-primary",
  Calling: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Connected: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "No Answer": "bg-muted text-muted-foreground",
  Busy: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Failed: "bg-destructive/10 text-destructive",
  Completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Cancelled: "bg-muted text-muted-foreground line-through",
};

export const DISPOSITION_TONE: Record<string, string> = {
  Sold: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Qualified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Interested: "bg-primary/10 text-primary",
  "Follow-up Required": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "No Answer": "bg-muted text-muted-foreground",
  Busy: "bg-muted text-muted-foreground",
  "Not Interested": "bg-muted text-muted-foreground",
  "Existing Customer": "bg-muted text-muted-foreground",
  "Wrong Number": "bg-destructive/10 text-destructive",
  DNC: "bg-destructive/15 text-destructive",
  "Invalid Lead": "bg-destructive/10 text-destructive",
};

/** m:ss for live timers. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Is the given moment inside the schedule? Used for the open/closed badge. */
export function isWithinHours(
  schedule: Record<string, { open: string; close: string } | null> | null | undefined,
  holidays: string[] | null | undefined,
  timezone: string,
  at: Date = new Date(),
): boolean {
  if (!schedule) return true;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const iso = `${parts["year"]}-${parts["month"]}-${parts["day"]}`;
  if ((holidays ?? []).includes(iso)) return false;
  const key = String(parts["weekday"] ?? "").slice(0, 3).toLowerCase() as Weekday;
  const day = schedule[key];
  if (!day) return false;
  const now = `${parts["hour"]}:${parts["minute"]}`;
  return now >= day.open && now <= day.close;
}
