import { trafficCalls } from "@/lib/company-data";

export const ESCALATION_TOPICS = [
  "Service Mismatch",
  "Lead quality",
  "Billing dispute",
  "Call recording issue",
  "Fraud / fake customer",
  "Duplicate call",
  "Agent behaviour",
  "Technical / routing",
] as const;

export const ESCALATION_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export const ESCALATION_RISKS = ["High Risk", "Medium Risk", "Low Risk"] as const;

export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];
export type EscalationRisk = (typeof ESCALATION_RISKS)[number];

export interface EscalationComment {
  id: string;
  author: string;
  at: string;
  body: string;
}

export interface Escalation {
  id: number;
  campaign: string;
  publisher: string;
  topic: string;
  status: EscalationStatus;
  risk: EscalationRisk;
  reporting: string;
  callerId: string;
  callId: string;
  escalatedTo: string;
  issuedBy: string;
  created: string;
  updated: string;
  message: string;
  comments: EscalationComment[];
}

const REPORTERS = ["Publisher Report", "Buyer Report", "Internal QA", "Compliance"];
const OWNERS = [
  "mariela@policybear.com",
  "qc.lead@policybear.com",
  "ops@policybear.com",
  "compliance@policybear.com",
];
const ISSUERS = [
  "Amit Kumar (amit@policybear.com)",
  "Leo Whitaker (leo@policybear.com)",
  "Dana Reyes (dana@policybear.com)",
];

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+1 ${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : raw;
};

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const callId = (seed: number) =>
  Array.from({ length: 32 }, (_, i) =>
    "0123456789ABCDEF".charAt((seed * (i + 7) + i * 13) % 16),
  ).join("");

export const escalations: Escalation[] = trafficCalls
  .filter((c) => c.publisher && c.campaign)
  .slice(0, 40)
  .map((call, index) => {
    const seed = hash(call.id);
    const created = call.date ? `${call.date}T${8 + (seed % 10)}:${String(seed % 60).padStart(2, "0")}:00` : "2026-08-15T11:18:00";
    return {
      id: 81 - index,
      campaign: call.campaign as string,
      publisher: call.publisher as string,
      topic: ESCALATION_TOPICS[seed % ESCALATION_TOPICS.length],
      status: ESCALATION_STATUSES[seed % ESCALATION_STATUSES.length],
      risk: ESCALATION_RISKS[seed % ESCALATION_RISKS.length],
      reporting: REPORTERS[seed % REPORTERS.length],
      callerId: formatPhone(call.callerId),
      callId: callId(seed),
      escalatedTo: OWNERS[seed % OWNERS.length],
      issuedBy: ISSUERS[seed % ISSUERS.length],
      created,
      updated: created,
      message:
        call.disposition?.slice(0, 320) ??
        `Escalated for review: ${call.issue}. Please verify the call intent against the campaign and confirm billing treatment.`,
      comments:
        seed % 3 === 0
          ? [
              {
                id: `${call.id}-c1`,
                author: "Leo Whitaker",
                at: created,
                body: `Reviewed the recording — ${call.issue.toLowerCase()}. Flagging to the publisher for credit.`,
              },
            ]
          : [],
    };
  });

export const statusTone: Record<EscalationStatus, string> = {
  OPEN: "bg-amber-500/12 text-amber-600 border-amber-500/30",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/30",
  RESOLVED: "bg-emerald-500/12 text-emerald-600 border-emerald-500/30",
  CLOSED: "bg-muted text-muted-foreground border-border",
};

export const riskTone: Record<EscalationRisk, string> = {
  "High Risk": "bg-destructive/10 text-destructive border-destructive/30",
  "Medium Risk": "bg-amber-500/12 text-amber-600 border-amber-500/30",
  "Low Risk": "bg-emerald-500/12 text-emerald-600 border-emerald-500/30",
};
