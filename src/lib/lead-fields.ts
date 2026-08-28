/**
 * Shared definition of every field an agent can fill on the desk lead card.
 * The intake panel renders these inputs and the Customers detail sheet renders
 * the saved values back with the exact same labels and grouping.
 */

import { agentMaster } from "@/lib/company-data";

export type LeadFieldKind = "text" | "date" | "number" | "area" | "yesno" | "select" | "toggle";
export type LeadField = {
  name: string;
  label: string;
  kind?: LeadFieldKind;
  placeholder?: string;
  /** predefined values for kind === "select" */
  options?: string[];
  /** select options resolved at render time (agent / carrier databases) */
  source?: "agents" | "carriers";
};
export type LeadSection = { id: string; title: string; fields: LeadField[] };

/** Carrier book — replace with a carriers table when one exists. */
export const CARRIER_OPTIONS = [
  "Occidental",
  "American Amicable",
  "Cigna",
  "Aetna",
  "Pioneer Security",
  "IA American",
  "Pioneer American",
  "Mutual of Omaha",
  "Transamerica",
  "Other",
];

/** Active licensed agents, pulled from the agent database. */
export function activeAgentNames() {
  return agentMaster.filter((a) => a.status === "Active").map((a) => a.name);
}

/** Resolve dynamic option lists for a field. */
export function leadFieldOptions(field: LeadField): string[] {
  if (field.source === "agents") return activeAgentNames();
  if (field.source === "carriers") return CARRIER_OPTIONS;
  return field.options ?? [];
}

export const LEAD_SECTIONS: LeadSection[] = [
  {
    id: "contact",
    title: "Contact & lead",
    fields: [
      { name: "fullName", label: "Full name" },
      { name: "dob", label: "Date of birth", kind: "date" },
      {
        name: "gender",
        label: "Customer gender",
        kind: "select",
        options: ["Male", "Female", "Other", "Prefer Not to Say"],
      },
      { name: "email", label: "Email" },
      { name: "altPhone", label: "Alternate phone" },
      { name: "state", label: "State" },
      { name: "source", label: "Lead source / publisher" },
    ],
  },
  {
    id: "policy",
    title: "Policy details",
    fields: [
      { name: "policyType", label: "Policy type", kind: "select", options: ["Immediate", "Graded", "ROP"] },
      { name: "policyNumber", label: "Policy number" },
      { name: "applicationNumber", label: "Application number" },
      { name: "writingAgent", label: "Writing agent name", kind: "select", source: "agents" },
      {
        name: "policyStatus",
        label: "Policy status",
        kind: "select",
        options: [
          "Submitted",
          "Pending",
          "Approved",
          "Issued",
          "Active",
          "Lapsed",
          "Reinstated",
          "Cancelled",
        ],
      },
      { name: "carrier", label: "Policy carrier", kind: "select", source: "carriers" },
      { name: "faceAmount", label: "Coverage amount", kind: "number" },
      { name: "premium", label: "Monthly premium", kind: "number" },
      {
        name: "billingFrequency",
        label: "Billing frequency",
        kind: "select",
        options: ["Monthly", "Quarterly", "Semi-Annual", "Annual"],
      },
      {
        name: "paymentMethod",
        label: "Payment method",
        kind: "select",
        options: ["Bank Draft", "Card", "Direct Bill", "Other"],
      },
      { name: "draftDate", label: "Draft date", kind: "date" },
    ],
  },
  {
    id: "compliance",
    title: "Beneficiary & compliance",
    fields: [
      { name: "applicationPdf", label: "Application PDF URL" },
      { name: "policyDelivery", label: "Policy delivery date", kind: "date" },
      { name: "recordingConfirmed", label: "Recording disclosure read", kind: "yesno" },
      { name: "beneficiary", label: "Beneficiary name" },
      {
        name: "beneficiaryRelationship",
        label: "Beneficiary relationship",
        kind: "select",
        options: ["Spouse", "Child", "Parent", "Sibling", "Relative", "Friend", "Other"],
      },
    ],
  },
  {
    id: "retention",
    title: "Retention",
    fields: [
      {
        name: "satisfaction",
        label: "Customer satisfaction",
        kind: "select",
        options: ["Satisfied", "Neutral", "Unsatisfied", "Needs Follow Up"],
      },
      { name: "retentionNotes", label: "Retention notes", kind: "area" },
    ],
  },
  {
    id: "crosssell",
    title: "Cross-sell opportunities",
    fields: [
      { name: "homeowner", label: "Homeowner", kind: "toggle" },
      { name: "autoOwner", label: "Auto owner", kind: "toggle" },
      { name: "spouseInterest", label: "Spouse / family interest", kind: "yesno" },
      { name: "crossSellNotes", label: "Opportunity notes", kind: "area" },
    ],
  },
  {
    id: "chargeback",
    title: "Chargeback prevention",
    fields: [
      { name: "firstDraft", label: "First draft successful", kind: "yesno" },
      { name: "nsfCount", label: "NSF count", kind: "number" },
      { name: "lapseDate", label: "Lapse date", kind: "date" },
      { name: "chargebackAmount", label: "Chargeback amount", kind: "number" },
      { name: "reinstated", label: "Reinstated", kind: "yesno" },
      {
        name: "lapseReason",
        label: "Reason for lapse",
        kind: "select",
        options: [
          "NSF",
          "Customer Cancelled",
          "Could Not Contact",
          "Changed Mind",
          "Wrong Payment Info",
          "Other",
        ],
      },
    ],
  },
  {
    id: "internal",
    title: "Internal notes & DNC",
    fields: [
      { name: "agentNotes", label: "Agent notes", kind: "area" },
      { name: "doNotContact", label: "Do not contact requested", kind: "yesno" },
      { name: "healthNotes", label: "Health / medication notes", kind: "area" },
    ],
  },
];

export const LEAD_FIELD_NAMES = LEAD_SECTIONS.flatMap((s) => s.fields.map((f) => f.name));

/** Label lookup for any field name, including ones only the call script writes. */
export const LEAD_FIELD_LABELS: Record<string, string> = LEAD_SECTIONS.reduce(
  (acc, section) => {
    for (const field of section.fields) acc[field.name] = field.label;
    return acc;
  },
  {} as Record<string, string>,
);

/** Turn a camelCase field name into a readable label as a fallback. */
export function humanizeFieldName(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

/** Group a saved lead-card record into sections, keeping extra keys in "Other". */
export function groupLeadValues(values: Record<string, string>) {
  const seen = new Set<string>();
  const groups = LEAD_SECTIONS.map((section) => {
    const entries = section.fields
      .filter((f) => {
        const filled = (values[f.name] ?? "").trim().length > 0;
        if (filled) seen.add(f.name);
        return filled;
      })
      .map((f) => ({ label: f.label, value: (values[f.name] ?? "").trim() }));
    return { id: section.id, title: section.title, entries };
  }).filter((g) => g.entries.length > 0);

  const extras = Object.entries(values ?? {})
    .filter(([k, v]) => !seen.has(k) && (v ?? "").trim().length > 0)
    .map(([k, v]) => ({ label: LEAD_FIELD_LABELS[k] ?? humanizeFieldName(k), value: v.trim() }));

  if (extras.length) groups.push({ id: "other", title: "Additional captured details", entries: extras });
  return groups;
}
