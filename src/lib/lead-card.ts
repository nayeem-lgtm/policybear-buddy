/**
 * Shared browser store for the agent lead card. The lead intake panel and the
 * guided call script both read and write the same record so an agent can type
 * while reading the script and see it reflected everywhere.
 */

export type LeadCardValues = Record<string, string>;

export const LEAD_CARD_EVENT = "pb:lead-card-updated";

export const leadCardKey = (phone: string) =>
  `pb.dialer.lead.${(phone ?? "").replace(/\D/g, "") || "unassigned"}`;

export function loadLeadCard(phone: string): LeadCardValues {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(leadCardKey(phone)) ?? "{}") as LeadCardValues;
  } catch {
    return {};
  }
}

export function saveLeadCard(phone: string, values: LeadCardValues) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(leadCardKey(phone), JSON.stringify(values));
  window.dispatchEvent(
    new CustomEvent(LEAD_CARD_EVENT, { detail: { phone, key: leadCardKey(phone) } }),
  );
}
