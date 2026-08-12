/**
 * Client-safe contracts for the CallTools two-way integration.
 *
 * Everything here is derived from the live CallTools OpenAPI document
 * (282 endpoints / 117 models on `west-2.calltools.io/api`), so field names
 * match the provider exactly. No secrets, no server-only imports — this module
 * is imported by both routes and server functions.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ endpoints */

/**
 * The subset of CallTools endpoints the CRM uses, kept in one place so a spec
 * change is a single edit rather than a hunt through handlers.
 */
export const CT = {
  users: "/users/",
  agentStatuses: "/agentstatuses/",
  agentStatus: (appUserId: string) => `/agentstatuses/${appUserId}/`,
  clickerStatuses: "/clickeragentstatuses/",
  clickerStatus: (appUserId: string) => `/clickeragentstatuses/${appUserId}/`,
  campaignAgent: (appUserId: string) => `/campaignagents/${appUserId}/`,
  calls: "/calls/",
  call: (id: string) => `/calls/${id}/`,
  liveCalls: "/livephonecalls/",
  hangup: (callUuid: string) => `/livephonecalls/${callUuid}/hangup/`,
  hangupTransfer: (callUuid: string) => `/livephonecalls/${callUuid}/hanguptransfer/`,
  dispositions: "/calldispositions/",
  historicalDispositions: "/historicalcalldispositions/",
  contacts: "/contacts/",
  contact: (id: string) => `/contacts/${id}/`,
  contactExists: "/contacts/exists/",
  contactHistory: (id: string) => `/contacthistory/${id}/`,
  notes: "/notes/",
  connectorButtons: "/connectorbuttons/",
  connectorButtonEvents: "/connectorbuttonevents/",
  callbackQueues: "/callbackqueues/",
  webCallbacks: "/webcallbacks/",
  webCallbackRequests: "/webcallbackrequests/",
  campaigns: "/campaigns/",
  buckets: "/buckets/",
  agentScripts: "/agentscripts/",
  transcripts: "/calltranscripts/",
  sms: "/sms/",
  restHooks: "/resthooksubscriptions/",
  restHookErrors: "/resthookerrorlogs/",
  agentPerformance: "/agentperformance/",
  agentLeaderboard: "/agentleaderboard/",
  teamPerformance: "/teamperformance/",
  campaignPerformance: "/campaignperformance/",
  loginShifts: "/userloginshifts/",
} as const;

/* --------------------------------------------------------------- capabilities */

export interface CallToolsCapabilities {
  /** Trigger an outbound call through a connector button click. */
  dial: boolean;
  /** Push Available / Break / Lunch into CallTools. */
  setAgentStatus: boolean;
  /** Write a disposition against a completed call. */
  setDisposition: boolean;
  /** End or transfer a call that is in progress. */
  callControl: boolean;
  /** Create or update contacts, notes and tags. */
  contacts: boolean;
  /** Schedule callbacks / web callback requests. */
  callbacks: boolean;
  /** Send an SMS. */
  sms: boolean;
  /** Register rest hook subscriptions for real-time events. */
  webhooks: boolean;
}

/** Every capability above is present in the spec; the settings row gates them. */
export const SPEC_CAPABILITIES: CallToolsCapabilities = {
  dial: true,
  setAgentStatus: true,
  setDisposition: true,
  callControl: true,
  contacts: true,
  callbacks: true,
  sms: true,
  webhooks: true,
};

/* -------------------------------------------------------------------- schemas */

export const CRM_STATUSES = [
  "Available",
  "On Call",
  "Break",
  "Lunch",
  "Meeting",
  "Training",
  "Unavailable",
  "Signed Out",
] as const;
export type CrmStatus = (typeof CRM_STATUSES)[number];

export const setStatusSchema = z.object({
  status: z.enum(CRM_STATUSES),
  detail: z.string().max(200).optional(),
});

export const dialSchema = z.object({
  phone: z.string().min(7).max(24),
  contactId: z.string().uuid().optional(),
  providerContactId: z.string().max(64).optional(),
  campaignId: z.string().max(64).optional(),
  queueId: z.string().max(64).optional(),
  callerId: z.string().max(64).optional(),
  queueItemId: z.string().uuid().optional(),
});

export const dispositionSchema = z.object({
  callUuid: z.string().min(1).max(120),
  dispositionId: z.string().min(1).max(64),
  phone: z.string().max(24).optional(),
  providerContactId: z.string().max(64).optional(),
  campaignId: z.string().max(64).optional(),
  notes: z.string().max(2000).optional(),
});

export const callControlSchema = z.object({
  callUuid: z.string().min(1).max(120),
  action: z.enum(["hangup", "transfer"]),
});

export const upsertContactSchema = z.object({
  contactId: z.string().uuid().optional(),
  providerContactId: z.string().max(64).optional(),
  fullName: z.string().min(1).max(120),
  phone: z.string().min(7).max(24),
  email: z.string().email().max(160).optional().or(z.literal("")),
  state: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
});

export const callbackSchema = z.object({
  phone: z.string().min(7).max(24),
  contactId: z.string().uuid().optional(),
  contactName: z.string().max(120).optional(),
  scheduledAt: z.string().min(4).max(40),
  campaignId: z.string().max(64).optional(),
  notes: z.string().max(1000).optional(),
});

export const smsSchema = z.object({
  phone: z.string().min(7).max(24),
  body: z.string().min(1).max(1600),
  contactId: z.string().uuid().optional(),
  providerContactId: z.string().max(64).optional(),
});

export const settingsSchema = z.object({
  writes_enabled: z.boolean().optional(),
  dial_enabled: z.boolean().optional(),
  status_sync_enabled: z.boolean().optional(),
  webhooks_enabled: z.boolean().optional(),
  connector_button_id: z.string().max(64).nullable().optional(),
  default_campaign_id: z.string().max(64).nullable().optional(),
  default_queue_id: z.string().max(64).nullable().optional(),
  default_caller_id: z.string().max(64).nullable().optional(),
  default_caller_number: z.string().max(32).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

/* ------------------------------------------------------------------- display */

export type OutboxStatus = "Pending" | "Sent" | "Failed" | "Dead";

export interface TelephonySettings {
  id: string;
  provider: string;
  writes_enabled: boolean;
  dial_enabled: boolean;
  status_sync_enabled: boolean;
  webhooks_enabled: boolean;
  connector_button_id: string | null;
  default_campaign_id: string | null;
  webhook_token: string;
  notes: string | null;
  updated_at: string;
}

export interface AgentDeskState {
  status: CrmStatus;
  providerStatus: string | null;
  ready: boolean;
  linked: boolean;
  providerAgentId: string | null;
  webPhoneStatus: string | null;
  liveCalls: number;
  callsToday: number;
  connectedToday: number;
  talkSecondsToday: number;
  lastCallAt: string | null;
}

export const ACTION_LABEL: Record<string, string> = {
  setAgentStatus: "Status change",
  dial: "Outbound call",
  hangup: "End call",
  transfer: "Transfer call",
  saveDisposition: "Disposition",
  upsertContact: "Contact update",
  pushCallback: "Callback",
  sendSms: "Text message",
};

/** Friendly, non-technical explanation for a failed provider write. */
export function explainFailure(error: string | null | undefined): string {
  if (!error) return "Unknown problem — retry to try again.";
  if (/401|403|authentication|forbidden/i.test(error))
    return "CallTools rejected our credentials. The API key may need to be refreshed.";
  if (/404|not found/i.test(error))
    return "CallTools could not find that record — it may have been deleted on their side.";
  if (/429|rate/i.test(error)) return "CallTools is rate-limiting us. It will retry shortly.";
  if (/timeout|aborted/i.test(error)) return "CallTools did not answer in time. It will retry.";
  if (/writes are disabled|switch/i.test(error))
    return "Sending to CallTools is currently switched off in settings.";
  return error;
}
