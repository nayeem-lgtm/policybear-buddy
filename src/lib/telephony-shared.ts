/**
 * Client-safe shared types, schemas and helpers for the telephony sync,
 * live monitoring and source-attribution screens.
 */

import { z } from "zod";

export const PROVIDERS = ["calltools", "callgrid"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABEL: Record<Provider, string> = {
  calltools: "CallTools",
  callgrid: "CallGrid",
};

export const callFilterSchema = z.object({
  provider: z.enum(["all", ...PROVIDERS]).default("all"),
  days: z.coerce.number().int().min(1).max(365).default(30),
  agent: z.string().default("all"),
  campaign: z.string().default("all"),
  search: z.string().max(60).default(""),
  limit: z.coerce.number().int().min(10).max(500).default(100),
});
export type CallFilters = z.infer<typeof callFilterSchema>;

export const overrideSchema = z.object({
  phone: z.string().min(7).max(20),
  provider: z.enum(PROVIDERS),
  reason: z.string().max(300).optional(),
});

export interface AgentActivity {
  agentName: string;
  provider: Provider;
  calls: number;
  connected: number;
  talkSeconds: number;
  lastCallAt: string | null;
  lastDisposition: string | null;
  onLiveCall: boolean;
}

/** Blocks non-operations staff from operations-wide telephony data. */
export async function assertOpsAccess(context: { supabase: { rpc: Function }; userId: string }) {
  const { data, error } = await (context.supabase.rpc as any)("is_ops", { _user_id: context.userId });
  if (error || !data) throw new Error("Forbidden: operations access required");
}

/** Blocks non-admins from write actions such as attribution overrides. */
export async function assertAdminAccess(context: { supabase: { rpc: Function }; userId: string }) {
  const { data, error } = await (context.supabase.rpc as any)("is_admin", { _user_id: context.userId });
  if (error || !data) throw new Error("Forbidden: administrator access required");
}
