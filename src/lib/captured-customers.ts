/**
 * Customers captured by agents on the desk (lead card + guided script).
 * Stored in the browser and merged into the Customers tab so anything an agent
 * types while on a call shows up as a customer record immediately.
 */

import type { Customer } from "@/lib/mock-data";
import type { LeadCardValues } from "@/lib/lead-card";
import { formatPhone } from "@/lib/phone";

export const CAPTURED_CUSTOMERS_EVENT = "pb:captured-customers-updated";
const STORE_KEY = "pb.crm.captured-customers";

export type CapturedCustomer = Customer & {
  captured: true;
  capturedAt: string;
  /** every field the agent typed on the lead card / call script */
  intake: LeadCardValues;
};

function digits(phone: string) {
  return (phone ?? "").replace(/\D/g, "");
}

export function loadCapturedCustomers(): CapturedCustomer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const list = raw ? (JSON.parse(raw) as CapturedCustomer[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(list: CapturedCustomer[]) {
  window.localStorage.setItem(STORE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(CAPTURED_CUSTOMERS_EVENT));
}

/** Map lead-card fields onto the customer shape used by the Customers tab. */
function toCustomer(
  phone: string,
  values: LeadCardValues,
  previous?: CapturedCustomer,
): CapturedCustomer {
  const today = new Date().toISOString().slice(0, 10);
  const name = (values["fullName"] ?? "").trim();
  const key = digits(phone);
  const status = values["doNotContact"] === "Yes"
    ? "Do Not Call"
    : values["policyNumber"]?.trim()
      ? "Active Policy"
      : values["applicationNumber"]?.trim()
        ? "Application Started"
        : values["policyType"]?.trim()
          ? "Quoted"
          : "Working";

  const tags = [
    values["homeowner"] === "Yes" ? "Homeowner" : null,
    values["autoOwner"] === "Yes" ? "Auto owner" : null,
    values["spouseInterest"] === "Yes" ? "Family interest" : null,
    values["reinstated"] === "Yes" ? "Reinstated" : null,
  ].filter(Boolean) as string[];

  return {
    id: previous?.id ?? `AGT-${key || Date.now().toString().slice(-6)}`,
    name: name || (phone ? formatPhone(phone) : "Unnamed lead"),
    phone: phone ? formatPhone(phone) : "",
    email: values["email"] ?? "",
    state: values["state"] ?? "",
    county: previous?.county ?? "",
    dob: values["dob"] ?? "",
    household: previous?.household ?? 1,
    income: previous?.income ?? "",
    source: values["source"] || "Agent capture",
    publisher: values["source"] ?? "",
    campaign: values["policyType"] ?? "",
    status,
    assignedAgent: values["writingAgent"] || previous?.assignedAgent || "Me",
    lastContact: today,
    policies: values["policyNumber"]?.trim() ? 1 : 0,
    tags,
    captured: true,
    intake: { ...values },
    capturedAt: previous?.capturedAt ?? new Date().toISOString(),
  };
}

/** Create or update the customer record backing a lead card. */
export function upsertCapturedCustomer(phone: string, values: LeadCardValues) {
  if (typeof window === "undefined") return;
  const hasData = Object.values(values ?? {}).some((v) => (v ?? "").trim().length > 0);
  const list = loadCapturedCustomers();
  const key = digits(phone);
  const index = list.findIndex((c) => digits(c.phone) === key && key.length > 0);

  if (!hasData) {
    if (index >= 0) {
      list.splice(index, 1);
      persist(list);
    }
    return;
  }

  const record = toCustomer(phone, values, index >= 0 ? list[index] : undefined);
  if (index >= 0) list[index] = record;
  else list.unshift(record);
  persist(list);
}
