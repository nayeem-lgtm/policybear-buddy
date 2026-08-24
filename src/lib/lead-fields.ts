/**
 * Shared definition of every field an agent can fill on the desk lead card.
 * The intake panel renders these inputs and the Customers detail sheet renders
 * the saved values back with the exact same labels and grouping.
 */

export type LeadFieldKind = "text" | "date" | "number" | "area" | "yesno";
export type LeadField = { name: string; label: string; kind?: LeadFieldKind; placeholder?: string };
export type LeadSection = { id: string; title: string; fields: LeadField[] };

export const LEAD_SECTIONS: LeadSection[] = [
  {
    id: "contact",
    title: "Contact & lead",
    fields: [
      { name: "fullName", label: "Full name" },
      { name: "dob", label: "Date of birth", kind: "date" },
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
      { name: "policyType", label: "Policy type" },
      { name: "policyNumber", label: "Policy number" },
      { name: "applicationNumber", label: "Application number" },
      { name: "writingAgent", label: "Writing agent name" },
      { name: "policyStatus", label: "Policy status" },
      { name: "carrier", label: "Carrier" },
      { name: "faceAmount", label: "Coverage amount", kind: "number" },
      { name: "premium", label: "Monthly premium", kind: "number" },
      { name: "paymentMethod", label: "Payment method (bank draft / direct bill)" },
      { name: "draftDate", label: "Draft date", kind: "date" },
    ],
  },
  {
    id: "compliance",
    title: "Compliance",
    fields: [
      { name: "applicationPdf", label: "Application PDF URL" },
      { name: "policyDelivery", label: "Policy delivery date", kind: "date" },
      { name: "recordingConfirmed", label: "Recording disclosure read", kind: "yesno" },
      { name: "beneficiary", label: "Beneficiary name & relationship" },
    ],
  },
  {
    id: "retention",
    title: "Retention",
    fields: [
      { name: "satisfaction", label: "Customer satisfaction (1-10)", kind: "number" },
      { name: "retentionNotes", label: "Retention notes", kind: "area" },
    ],
  },
  {
    id: "crosssell",
    title: "Cross-sell opportunities",
    fields: [
      { name: "homeowner", label: "Homeowner", kind: "yesno" },
      { name: "autoOwner", label: "Auto owner", kind: "yesno" },
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
      { name: "lapseReason", label: "Reason for lapse" },
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
