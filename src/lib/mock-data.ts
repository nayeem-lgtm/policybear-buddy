/**
 * Front-end mock dataset for the Policy Bear Operations CRM.
 * Every export here is a stand-in for a future API response — the shapes mirror
 * the relational database map so wiring real endpoints later is a swap, not a rewrite.
 */

import { rebaseRows } from "@/lib/data-clock";
import { AGENT_NAMES } from "@/lib/company-data";

export type Role =
  | "Agent"
  | "QC"
  | "HR"
  | "Accounting"
  | "Operations"
  | "CEO"
  | "Administrator";

export const ROLES: Role[] = [
  "Agent",
  "QC",
  "HR",
  "Accounting",
  "Operations",
  "CEO",
  "Administrator",
];

export type PresenceStatus =
  | "Signed Out"
  | "Available"
  | "On Call"
  | "Post Call"
  | "Break"
  | "Lunch"
  | "Not Available"
  | "Meeting"
  | "Training";

export const PRESENCE_STATUSES: PresenceStatus[] = [
  "Available",
  "On Call",
  "Post Call",
  "Break",
  "Lunch",
  "Not Available",
  "Meeting",
  "Training",
  "Signed Out",
];

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  team: string;
  title: string;
  status: PresenceStatus;
  callToolsStatus: string;
  statusDuration: string;
  signedInAt: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  shiftTemplate: string;
  timeZone: string;
  callsToday: number;
  paidCalls: number;
  sales: number;
  callbacksDue: number;
  postCallPending: number;
  alert: string | null;
  hireDate: string;
  manager: string;
  phone: string;
  trainingProgress: number;
  avatarInitials: string;
}

const firstNames = [
  "Amelia",
  "Marcus",
  "Priya",
  "Diego",
  "Hannah",
  "Tomas",
  "Grace",
  "Noah",
  "Isabel",
  "Owen",
  "Farah",
  "Liam",
  "Sofia",
  "Ethan",
  "Nadia",
  "Caleb",
  "Rosa",
  "Jonah",
  "Mei",
  "Andre",
  "Talia",
  "Victor",
  "Emma",
  "Rashid",
];
const lastNames = [
  "Carter",
  "Delgado",
  "Nair",
  "Ramirez",
  "Whitfield",
  "Kovac",
  "Okafor",
  "Bennett",
  "Moreno",
  "Fletcher",
  "Haddad",
  "Doyle",
  "Vargas",
  "Brooks",
  "Rahimi",
  "Sutton",
  "Ibarra",
  "Klein",
  "Chen",
  "Baptiste",
  "Werner",
  "Petrov",
  "Lindqvist",
  "Karim",
];

const departments = [
  "Sales",
  "Quality Control",
  "Human Resources",
  "Accounting",
  "Operations",
  "Executive",
  "Technical Administration",
];

const teams = ["Team Alpha", "Team Bravo", "Team Charlie", "Team Delta"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length] as T;
}

const roleByIndex: Role[] = [
  "Agent",
  "Agent",
  "Agent",
  "Agent",
  "QC",
  "Agent",
  "Agent",
  "HR",
  "Agent",
  "Agent",
  "Accounting",
  "Agent",
  "QC",
  "Agent",
  "Operations",
  "Agent",
  "Agent",
  "CEO",
  "Agent",
  "Administrator",
  "Agent",
  "QC",
  "Agent",
  "HR",
];

const statusByIndex: PresenceStatus[] = [
  "Available",
  "On Call",
  "Post Call",
  "Break",
  "Available",
  "On Call",
  "Lunch",
  "Available",
  "On Call",
  "Not Available",
  "Available",
  "Post Call",
  "Available",
  "Break",
  "Available",
  "On Call",
  "Meeting",
  "Available",
  "Training",
  "Available",
  "On Call",
  "Available",
  "Signed Out",
  "Available",
];

export const employees: Employee[] = Array.from({ length: 24 }, (_, i) => {
  const name = `${pick(firstNames, i)} ${pick(lastNames, i + 3)}`;
  const role = pick(roleByIndex, i);
  const status = pick(statusByIndex, i);
  return {
    id: `EMP-${1000 + i}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@policybear.com`,
    role,
    department:
      role === "Agent"
        ? "Sales"
        : role === "QC"
          ? "Quality Control"
          : role === "HR"
            ? "Human Resources"
            : role === "Accounting"
              ? "Accounting"
              : role === "Operations"
                ? "Operations"
                : role === "CEO"
                  ? "Executive"
                  : pick(departments, i),
    team: pick(teams, i),
    title:
      role === "Agent"
        ? "Licensed Sales Agent"
        : role === "QC"
          ? "Quality Analyst"
          : role === "HR"
            ? "HR Specialist"
            : role === "Accounting"
              ? "Accounting Analyst"
              : role === "Operations"
                ? "Operations Lead"
                : role === "CEO"
                  ? "Chief Executive Officer"
                  : "Systems Administrator",
    status,
    callToolsStatus:
      status === "On Call"
        ? "Talking"
        : status === "Break" || status === "Lunch"
          ? "Break"
          : status === "Signed Out"
            ? "Logged Out"
            : "Ready",
    statusDuration: `${(i * 7) % 48}m`,
    signedInAt: status === "Signed Out" ? null : "07:0" + (i % 9),
    scheduledStart: "07:00",
    scheduledEnd: "16:00",
    shiftTemplate: "Standard Pacific 7:00–16:00",
    timeZone: "America/Los_Angeles",
    callsToday: 6 + ((i * 5) % 40),
    paidCalls: 3 + ((i * 3) % 22),
    sales: (i * 2) % 7,
    callbacksDue: i % 5,
    postCallPending: i % 3,
    alert:
      i % 7 === 3
        ? "Extended break"
        : i % 11 === 5
          ? "Status mismatch"
          : i % 9 === 8
            ? "Overdue callback"
            : null,
    hireDate: `202${3 + (i % 3)}-0${(i % 9) + 1}-1${i % 9}`,
    manager: "Owen Klein",
    phone: `+1 (415) 555-0${100 + i}`,
    trainingProgress: pick([100, 84, 62, 45, 92, 30, 77], i),
    avatarInitials: name
      .split(" ")
      .map((n) => n[0])
      .join(""),
  };
});

export const currentUser = {
  ...pick(employees, 0),
  name: "Amelia Carter",
  role: "Agent" as Role,
  roles: ROLES,
};

/* ------------------------------------------------------------------ customers */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  state: string;
  county: string;
  dob: string;
  household: number;
  income: string;
  source: string;
  publisher: string;
  campaign: string;
  status: string;
  assignedAgent: string;
  lastContact: string;
  policies: number;
  tags: string[];
}

const states = ["TX", "FL", "GA", "AZ", "NC", "OH", "TN", "MI", "PA", "IL"];
const sources = ["Inbound Call", "Personal Lead", "Callback", "Web Form", "Referral"];
const custStatuses = [
  "New",
  "Working",
  "Quoted",
  "Application Started",
  "Submitted",
  "Active Policy",
  "Not Interested",
  "Do Not Call",
];

export const customers: Customer[] = Array.from({ length: 42 }, (_, i) => {
  const name = `${pick(firstNames, i + 5)} ${pick(lastNames, i + 9)}`;
  return {
    id: `CUS-${5200 + i}`,
    name,
    phone: `+1 (${210 + (i % 60)}) 555-${1000 + i}`,
    email: `${name.toLowerCase().replace(/\s+/g, "")}@example.com`,
    state: pick(states, i),
    county: pick(["Harris", "Dade", "Fulton", "Maricopa", "Wake", "Franklin"], i),
    dob: `19${60 + (i % 35)}-0${(i % 9) + 1}-${10 + (i % 18)}`,
    household: 1 + (i % 5),
    income: `$${28 + (i % 40)},${(i * 137) % 900}00`,
    source: pick(sources, i),
    publisher: pick(["BlueRock Media", "Northline Leads", "Sunbelt Direct", "Vertex Ads"], i),
    campaign: pick(["ACA Q3 Inbound", "U65 Retarget", "Medicare Spanish", "Open Enrollment"], i),
    status: pick(custStatuses, i),
    assignedAgent: pick(employees, i % 12).name,
    lastContact: `2026-0${(i % 8) + 1}-1${i % 9}`,
    policies: i % 3,
    tags: i % 4 === 0 ? ["Callback", "Spanish"] : i % 3 === 0 ? ["High Intent"] : [],
  };
});

/* ---------------------------------------------------------------------- calls */

export interface CallRecord {
  id: string;
  callId: string;
  customer: string;
  phone: string;
  agent: string;
  publisher: string;
  campaign: string;
  direction: "Inbound" | "Outbound";
  startedAt: string;
  duration: string;
  billableSeconds: number;
  paid: boolean;
  cost: string;
  disposition: string;
  qaStatus: "Pending" | "Valid" | "Invalid" | "Returned" | "Disputed";
  recording: boolean;
  matched: boolean;
}

const dispositions = [
  "Sale",
  "Callback Scheduled",
  "Not Interested",
  "Not Qualified",
  "Voicemail",
  "Duplicate",
  "Wrong Number",
  "No Disposition",
];

export const calls: CallRecord[] = Array.from({ length: 60 }, (_, i) => ({
  id: `CALL-${9000 + i}`,
  callId: `CT-${480000 + i * 17}`,
  customer: pick(customers, i % customers.length).name,
  phone: pick(customers, i % customers.length).phone,
  agent: pick(AGENT_NAMES, i),
  publisher: pick(["BlueRock Media", "Northline Leads", "Sunbelt Direct", "Vertex Ads"], i),
  campaign: pick(["ACA Q3 Inbound", "U65 Retarget", "Medicare Spanish", "Open Enrollment"], i),
  direction: i % 5 === 0 ? "Outbound" : "Inbound",
  startedAt: `2026-08-03 0${7 + (i % 8)}:${(i * 7) % 60 < 10 ? "0" : ""}${(i * 7) % 60}`,
  duration: `${1 + (i % 12)}m ${(i * 11) % 60}s`,
  billableSeconds: 30 + ((i * 23) % 400),
  paid: (30 + ((i * 23) % 400)) > 120,
  cost: `$${(8 + (i % 22)).toFixed(2)}`,
  disposition: pick(dispositions, i),
  qaStatus: pick(
    ["Pending", "Valid", "Invalid", "Returned", "Disputed"] as const,
    i,
  ),
  recording: i % 9 !== 4,
  matched: i % 13 !== 6,
}));

/* ------------------------------------------------------------------ callbacks */

export interface Callback {
  id: string;
  customer: string;
  phone: string;
  agent: string;
  scheduledFor: string;
  timeZone: string;
  reason: string;
  priority: "Low" | "Normal" | "High" | "Urgent";
  status: "Due" | "Scheduled" | "Overdue" | "Completed" | "Missed";
  attempts: number;
  notes: string;
}

export const callbacks: Callback[] = Array.from({ length: 28 }, (_, i) => ({
  id: `CB-${3100 + i}`,
  customer: pick(customers, (i * 3) % customers.length).name,
  phone: pick(customers, (i * 3) % customers.length).phone,
  agent: pick(AGENT_NAMES, i),
  scheduledFor: `2026-08-0${(i % 6) + 3} ${9 + (i % 7)}:${i % 2 ? "30" : "00"}`,
  timeZone: pick(["PT", "CT", "ET", "MT"], i),
  reason: pick(
    ["Needs spouse present", "Requested pricing", "Document pending", "Payment method", "Comparing plans"],
    i,
  ),
  priority: pick(["Low", "Normal", "High", "Urgent"] as const, i),
  status: pick(["Due", "Scheduled", "Overdue", "Completed", "Missed"] as const, i),
  attempts: i % 4,
  notes: "Customer prefers afternoon contact.",
}));

/* ---------------------------------------------------------- sales & policies */

export interface Policy {
  id: string;
  policyNumber: string;
  customer: string;
  agent: string;
  carrier: string;
  plan: string;
  planType: string;
  premium: number;
  subsidy: number;
  members: number;
  effectiveDate: string;
  submittedAt: string;
  status: string;
  paymentStatus: string;
  commission: number;
  qaStatus: string;
  source: string;
}

export const carriers = [
  "Ambetter",
  "Oscar Health",
  "Cigna",
  "Molina Healthcare",
  "Aetna CVS",
  "Blue Cross Blue Shield",
  "UnitedHealthcare",
  "Anthem",
];

const policyStatuses = [
  "Draft",
  "Submitted",
  "Pending Carrier",
  "Active",
  "Effectuated",
  "Cancelled",
  "Chargeback",
];

export const policies: Policy[] = Array.from({ length: 46 }, (_, i) => ({
  id: `POL-${7400 + i}`,
  policyNumber: `PB-${2026}-${40000 + i * 13}`,
  customer: pick(customers, i % customers.length).name,
  agent: pick(AGENT_NAMES, i),
  carrier: pick(carriers, i),
  plan: pick(
    ["Silver 94 HMO", "Bronze Essential PPO", "Gold Select HMO", "Silver Value+", "Bronze Standard"],
    i,
  ),
  planType: pick(["ACA", "Medicare Advantage", "Short Term", "Dental + Vision"], i),
  premium: 120 + ((i * 37) % 480),
  subsidy: (i * 29) % 420,
  members: 1 + (i % 5),
  effectiveDate: `2026-0${(i % 9) + 1}-01`,
  submittedAt: `2026-08-0${(i % 3) + 1}`,
  status: pick(policyStatuses, i),
  paymentStatus: pick(["Paid", "Pending", "Failed", "Refunded"], i),
  commission: 45 + ((i * 17) % 260),
  qaStatus: pick(["Pending", "Valid", "Invalid"], i),
  source: pick(sources, i),
}));

/* ------------------------------------------------------------------- quoting */

export interface QuotePlan {
  id: string;
  carrier: string;
  planName: string;
  metal: "Bronze" | "Silver" | "Gold" | "Platinum" | "Catastrophic";
  type: "HMO" | "PPO" | "EPO";
  premium: number;
  subsidizedPremium: number;
  deductible: number;
  oopMax: number;
  pcpCopay: number;
  specialistCopay: number;
  genericRx: number;
  network: string;
  hsaEligible: boolean;
  rating: number;
  benefitsHighlights: string[];
  autoSubmitSupported: boolean;
}

export const quotePlans: QuotePlan[] = Array.from({ length: 18 }, (_, i) => {
  const premium = 180 + ((i * 63) % 520);
  const subsidy = (i * 41) % 340;
  return {
    id: `PLAN-${100 + i}`,
    carrier: pick(carriers, i),
    planName: pick(
      [
        "Clear Value Silver 94",
        "Essential Bronze 60",
        "Select Gold HMO",
        "Complete Care PPO",
        "Everyday Health Silver",
        "Prime Choice EPO",
      ],
      i,
    ),
    metal: pick(["Bronze", "Silver", "Gold", "Platinum", "Catastrophic"] as const, i),
    type: pick(["HMO", "PPO", "EPO"] as const, i),
    premium,
    subsidizedPremium: Math.max(0, premium - subsidy),
    deductible: 500 + ((i * 350) % 7000),
    oopMax: 3500 + ((i * 900) % 6000),
    pcpCopay: pick([0, 5, 15, 25, 35], i),
    specialistCopay: pick([20, 40, 60, 75], i),
    genericRx: pick([0, 3, 5, 10], i),
    network: pick(["Statewide", "Regional", "Local Plus", "National"], i),
    hsaEligible: i % 4 === 0,
    rating: 3 + (i % 3) * 0.5,
    benefitsHighlights: [
      "$0 virtual primary care",
      "Free preventive services",
      i % 2 ? "Dental + vision included" : "24/7 nurse line",
    ],
    autoSubmitSupported: i % 6 !== 5,
  };
});

/* ------------------------------------------------------------------------ QA */

export interface QAReview {
  id: string;
  callId: string;
  agent: string;
  reviewer: string;
  customer: string;
  publisher: string;
  submittedAt: string;
  deadline: string;
  score: number;
  outcome: "Pending" | "Valid" | "Invalid" | "Returned" | "Disputed";
  reason: string;
  recording: boolean;
}

export const qaReviews: QAReview[] = Array.from({ length: 34 }, (_, i) => ({
  id: `QA-${2200 + i}`,
  callId: pick(calls, i % calls.length).callId,
  agent: pick(AGENT_NAMES, i),
  reviewer: pick(employees, 4).name,
  customer: pick(customers, i % customers.length).name,
  publisher: pick(["BlueRock Media", "Northline Leads", "Sunbelt Direct", "Vertex Ads"], i),
  submittedAt: `2026-08-0${(i % 3) + 1}`,
  deadline: `2026-08-0${(i % 3) + 4}`,
  score: 55 + ((i * 7) % 45),
  outcome: pick(["Pending", "Valid", "Invalid", "Returned", "Disputed"] as const, i),
  reason: pick(
    ["Short duration", "Wrong intent", "No consent captured", "Duplicate lead", "Meets criteria"],
    i,
  ),
  recording: i % 8 !== 3,
}));

/* ---------------------------------------------------------------- publishers */

export interface Publisher {
  id: string;
  name: string;
  status: "Active" | "Paused" | "Under Review" | "Terminated";
  campaigns: number;
  callsToday: number;
  paidCalls: number;
  sales: number;
  conversion: string;
  invalidRate: string;
  cost: number;
  revenue: number;
  contact: string;
  payoutTerms: string;
}

export const publishers: Publisher[] = Array.from({ length: 12 }, (_, i) => ({
  id: `PUB-${400 + i}`,
  name: pick(
    [
      "BlueRock Media",
      "Northline Leads",
      "Sunbelt Direct",
      "Vertex Ads",
      "Harborlight Digital",
      "Redwood Performance",
    ],
    i,
  ) + (i > 5 ? " II" : ""),
  status: pick(["Active", "Paused", "Under Review", "Terminated"] as const, i),
  campaigns: 1 + (i % 5),
  callsToday: 20 + ((i * 31) % 200),
  paidCalls: 10 + ((i * 17) % 120),
  sales: i % 9,
  conversion: `${(4 + (i % 12)).toFixed(1)}%`,
  invalidRate: `${(2 + (i % 9)).toFixed(1)}%`,
  cost: 800 + ((i * 430) % 9000),
  revenue: 1500 + ((i * 830) % 14000),
  contact: `partners@${pick(["bluerock", "northline", "sunbelt", "vertex"], i)}.com`,
  payoutTerms: pick(["Net 15", "Net 30", "Weekly", "Prepay"], i),
}));

/* -------------------------------------------------------------------- payroll */

export interface PayrollRow {
  id: string;
  employee: string;
  role: Role;
  period: string;
  scheduledHours: number;
  paidHours: number;
  overtime: number;
  basePay: number;
  commission: number;
  bonus: number;
  deductions: number;
  net: number;
  status: "Draft" | "In Review" | "Approved" | "Paid" | "Disputed";
}

export const payrollRows: PayrollRow[] = employees.slice(0, 20).map((e, i) => {
  const base = 1600 + ((i * 91) % 1400);
  const commission = (i * 137) % 2400;
  const bonus = (i % 4) * 120;
  const deductions = 180 + ((i * 23) % 400);
  return {
    id: `PR-${8800 + i}`,
    employee: e.name,
    role: e.role,
    period: "Aug 1 – Aug 15, 2026",
    scheduledHours: 80,
    paidHours: 72 + (i % 9),
    overtime: i % 5,
    basePay: base,
    commission,
    bonus,
    deductions,
    net: base + commission + bonus - deductions,
    status: pick(["Draft", "In Review", "Approved", "Paid", "Disputed"] as const, i),
  };
});

/* ------------------------------------------------------------------- training */

export interface Course {
  id: string;
  title: string;
  category: string;
  description: string;
  lessons: number;
  durationMinutes: number;
  progress: number;
  required: boolean;
  dueDate: string;
  assessment: "Exam" | "Survey" | "None";
  passingScore: number;
  assignedRoles: Role[];
  enrolled: number;
  completionRate: number;
  thumbnailHue: string;
}

export const courses: Course[] = [
  {
    id: "CRS-101",
    title: "Policy Bear Onboarding Essentials",
    category: "Onboarding",
    description:
      "Company story, tone of voice, compliance basics and the daily operating rhythm every new hire follows.",
    lessons: 8,
    durationMinutes: 96,
    progress: 100,
    required: true,
    dueDate: "2026-08-05",
    assessment: "Exam",
    passingScore: 80,
    assignedRoles: ROLES,
    enrolled: 24,
    completionRate: 91,
    thumbnailHue: "brand",
  },
  {
    id: "CRS-102",
    title: "ACA Marketplace Fundamentals",
    category: "Product",
    description: "Metal tiers, subsidies, special enrollment periods and eligibility screening.",
    lessons: 12,
    durationMinutes: 148,
    progress: 64,
    required: true,
    dueDate: "2026-08-12",
    assessment: "Exam",
    passingScore: 85,
    assignedRoles: ["Agent", "QC"],
    enrolled: 18,
    completionRate: 62,
    thumbnailHue: "cyan",
  },
  {
    id: "CRS-103",
    title: "Compliant Call Openings & Consent",
    category: "Compliance",
    description: "Required disclosures, recorded consent language and the QA scoring rubric.",
    lessons: 6,
    durationMinutes: 54,
    progress: 30,
    required: true,
    dueDate: "2026-08-09",
    assessment: "Exam",
    passingScore: 90,
    assignedRoles: ["Agent", "QC"],
    enrolled: 20,
    completionRate: 48,
    thumbnailHue: "yellow",
  },
  {
    id: "CRS-104",
    title: "Quote Engine & Bot Submission",
    category: "Systems",
    description:
      "Pull multi-carrier quotes, compare plans side by side and let the submission bot finish the application.",
    lessons: 5,
    durationMinutes: 42,
    progress: 0,
    required: false,
    dueDate: "2026-08-20",
    assessment: "Survey",
    passingScore: 0,
    assignedRoles: ["Agent"],
    enrolled: 16,
    completionRate: 12,
    thumbnailHue: "teal",
  },
  {
    id: "CRS-105",
    title: "Objection Handling Masterclass",
    category: "Sales Skills",
    description: "Nine common objections, reframes and the close patterns that hold up in QA.",
    lessons: 9,
    durationMinutes: 110,
    progress: 45,
    required: false,
    dueDate: "2026-08-28",
    assessment: "None",
    passingScore: 0,
    assignedRoles: ["Agent"],
    enrolled: 15,
    completionRate: 39,
    thumbnailHue: "orange",
  },
  {
    id: "CRS-106",
    title: "HIPAA & Data Handling",
    category: "Compliance",
    description: "Protected health information, secure sharing and incident reporting duties.",
    lessons: 4,
    durationMinutes: 38,
    progress: 100,
    required: true,
    dueDate: "2026-08-02",
    assessment: "Exam",
    passingScore: 90,
    assignedRoles: ROLES,
    enrolled: 24,
    completionRate: 100,
    thumbnailHue: "lavender",
  },
];

export interface Lesson {
  id: string;
  title: string;
  durationMinutes: number;
  type: "Video" | "Reading" | "Exam" | "Survey";
  completed: boolean;
}

export const lessonsByCourse: Record<string, Lesson[]> = {
  default: [
    { id: "L1", title: "Welcome from the founders", durationMinutes: 6, type: "Video", completed: true },
    { id: "L2", title: "How Policy Bear makes money", durationMinutes: 11, type: "Video", completed: true },
    { id: "L3", title: "The daily operating rhythm", durationMinutes: 14, type: "Video", completed: true },
    { id: "L4", title: "Attendance, breaks and status rules", durationMinutes: 12, type: "Video", completed: false },
    { id: "L5", title: "Reading: Employee handbook excerpt", durationMinutes: 9, type: "Reading", completed: false },
    { id: "L6", title: "Working with QA", durationMinutes: 13, type: "Video", completed: false },
    { id: "L7", title: "Knowledge check", durationMinutes: 15, type: "Exam", completed: false },
    { id: "L8", title: "Onboarding experience survey", durationMinutes: 5, type: "Survey", completed: false },
  ],
};

/* ---------------------------------------------------------------- automations */

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  audience: string;
  channel: "Email" | "In-App" | "SMS" | "Task";
  steps: number;
  status: "Active" | "Paused" | "Draft";
  lastRun: string;
  sent30d: number;
  openRate: string;
  owner: string;
}

export const automations: Automation[] = [
  {
    id: "AUT-01",
    name: "New Hire Onboarding Sequence",
    trigger: "Employee created",
    audience: "All new hires",
    channel: "Email",
    steps: 7,
    status: "Active",
    lastRun: "2 hours ago",
    sent30d: 42,
    openRate: "88%",
    owner: "Human Resources",
  },
  {
    id: "AUT-02",
    name: "Required Training Reminder",
    trigger: "Course due in 48 hours",
    audience: "Assigned learners",
    channel: "Email",
    steps: 3,
    status: "Active",
    lastRun: "35 minutes ago",
    sent30d: 116,
    openRate: "72%",
    owner: "Human Resources",
  },
  {
    id: "AUT-03",
    name: "Day 30 Check-In",
    trigger: "30 days after hire date",
    audience: "New hires",
    channel: "Task",
    steps: 2,
    status: "Active",
    lastRun: "Yesterday",
    sent30d: 9,
    openRate: "—",
    owner: "Human Resources",
  },
  {
    id: "AUT-04",
    name: "Break Overrun Escalation",
    trigger: "Break exceeds allowance by 5 minutes",
    audience: "Agent + Team Lead",
    channel: "In-App",
    steps: 3,
    status: "Active",
    lastRun: "12 minutes ago",
    sent30d: 61,
    openRate: "—",
    owner: "Operations",
  },
  {
    id: "AUT-05",
    name: "Exam Failure Remediation",
    trigger: "Exam score below passing",
    audience: "Learner + Trainer",
    channel: "Email",
    steps: 4,
    status: "Paused",
    lastRun: "6 days ago",
    sent30d: 4,
    openRate: "64%",
    owner: "Human Resources",
  },
  {
    id: "AUT-06",
    name: "Offboarding Checklist",
    trigger: "Termination date set",
    audience: "HR + IT + Payroll",
    channel: "Task",
    steps: 6,
    status: "Draft",
    lastRun: "—",
    sent30d: 0,
    openRate: "—",
    owner: "Human Resources",
  },
];

/* ---------------------------------------------------------------------- misc */

export interface TaskItem {
  id: string;
  title: string;
  recordType: string;
  related: string;
  priority: "Low" | "Normal" | "High" | "Urgent";
  dueDate: string;
  assignedBy: string;
  status: "Not Started" | "In Progress" | "Waiting" | "Completed";
  latestComment: string;
}

export const tasks: TaskItem[] = Array.from({ length: 22 }, (_, i) => ({
  id: `TSK-${600 + i}`,
  title: pick(
    [
      "Follow up on pending carrier response",
      "Upload missing recording",
      "Complete post-call form",
      "Review attendance exception",
      "Approve commission adjustment",
      "Respond to QA dispute",
      "Collect signed authorization",
    ],
    i,
  ),
  recordType: pick(["Policy", "Call", "Attendance", "Payroll", "QA", "Customer"], i),
  related: pick(customers, i % customers.length).name,
  priority: pick(["Low", "Normal", "High", "Urgent"] as const, i),
  dueDate: `2026-08-0${(i % 8) + 1}`,
  assignedBy: pick(employees, (i + 3) % 12).name,
  status: pick(["Not Started", "In Progress", "Waiting", "Completed"] as const, i),
  latestComment: "Waiting on customer callback confirmation.",
}));

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: "Urgent" | "Attendance" | "Sales" | "QA" | "Policies" | "Payroll" | "System" | "Mentions";
  time: string;
  read: boolean;
}

export const notifications: NotificationItem[] = [
  { id: "N1", title: "Break overrun detected", body: "You exceeded your 15-minute break by 4 minutes.", category: "Urgent", time: "2m ago", read: false },
  { id: "N2", title: "QA returned a call", body: "Call CT-480136 was marked Invalid — short duration.", category: "QA", time: "18m ago", read: false },
  { id: "N3", title: "New policy effectuated", body: "PB-2026-40052 for Rosa Ibarra is now active.", category: "Policies", time: "41m ago", read: false },
  { id: "N4", title: "Required training due", body: "Compliant Call Openings & Consent is due in 2 days.", category: "System", time: "1h ago", read: true },
  { id: "N5", title: "Commission period opened", body: "Aug 1–15 commissions are ready for review.", category: "Payroll", time: "3h ago", read: true },
  { id: "N6", title: "Marcus mentioned you", body: "“Can you take the callback for the Delgado household?”", category: "Mentions", time: "4h ago", read: true },
  { id: "N7", title: "Late sign-in recorded", body: "Sign-in at 07:12 against a 07:00 shift start.", category: "Attendance", time: "Yesterday", read: true },
  { id: "N8", title: "Daily sales target reached", body: "Team Alpha hit 18 of 18 submitted applications.", category: "Sales", time: "Yesterday", read: true },
];

export const announcements = [
  {
    id: "ANN-1",
    title: "Open Enrollment war room starts Monday",
    body: "Daily stand-up moves to 6:45 AM PT for the duration of OEP. Camera on, CallTools open by 6:55.",
    author: "Owen Klein",
    department: "Operations",
    date: "2026-08-03",
    priority: "High",
    acknowledgeRequired: true,
    acknowledged: 18,
    audience: 24,
  },
  {
    id: "ANN-2",
    title: "New carrier added: Anthem",
    body: "Anthem plans are now live in the quote engine for TX, GA and OH. Bot submission is supported.",
    author: "Isabel Moreno",
    department: "Sales",
    date: "2026-08-01",
    priority: "Normal",
    acknowledgeRequired: false,
    acknowledged: 21,
    audience: 24,
  },
  {
    id: "ANN-3",
    title: "Updated break policy reminder",
    body: "Breaks are 9:00–9:15 and 1:30–1:45, lunch 11:00–11:30 Pacific. Overruns now trigger an on-screen alarm.",
    author: "Nadia Rahimi",
    department: "Human Resources",
    date: "2026-07-29",
    priority: "High",
    acknowledgeRequired: true,
    acknowledged: 24,
    audience: 24,
  },
];

export const integrations = [
  { id: "INT-1", name: "CallTools", category: "Dialer", status: "Connected", lastSync: "12s ago", errors24h: 0, direction: "Bi-directional" },
  { id: "INT-2", name: "HealthSherpa", category: "Enrollment", status: "Connected", lastSync: "1m ago", errors24h: 2, direction: "Outbound" },
  { id: "INT-3", name: "Carrier Quote API", category: "Quoting", status: "Connected", lastSync: "40s ago", errors24h: 0, direction: "Inbound" },
  { id: "INT-4", name: "OTP Mailbox Reader", category: "Automation", status: "Connected", lastSync: "6s ago", errors24h: 1, direction: "Inbound" },
  { id: "INT-5", name: "Google Workspace", category: "Identity", status: "Connected", lastSync: "5m ago", errors24h: 0, direction: "Bi-directional" },
  { id: "INT-6", name: "Payline", category: "Payments", status: "Degraded", lastSync: "22m ago", errors24h: 7, direction: "Bi-directional" },
  { id: "INT-7", name: "Ringba", category: "Call Routing", status: "Connected", lastSync: "18s ago", errors24h: 0, direction: "Inbound" },
  { id: "INT-8", name: "Payroll Provider", category: "Finance", status: "Not Configured", lastSync: "—", errors24h: 0, direction: "Outbound" },
];

export const incidents = Array.from({ length: 14 }, (_, i) => ({
  id: `INC-${300 + i}`,
  title: pick(
    ["Dialer dropped calls", "Recording upload failed", "Duplicate lead billing", "Meet camera outage", "Carrier portal timeout"],
    i,
  ),
  severity: pick(["Low", "Medium", "High", "Critical"], i),
  category: pick(["Technical", "Compliance", "HR", "Vendor"], i),
  reportedBy: pick(employees, i % 12).name,
  assignedTo: pick(employees, (i + 5) % 12).name,
  status: pick(["Open", "Investigating", "Resolved", "Closed"], i),
  reportedAt: `2026-08-0${(i % 3) + 1}`,
  slaDue: `2026-08-0${(i % 3) + 3}`,
}));

export const expenses = Array.from({ length: 18 }, (_, i) => ({
  id: `EXP-${900 + i}`,
  vendor: pick(["CallTools", "Google Workspace", "BlueRock Media", "Office Depot", "AWS", "Payline"], i),
  category: pick(["Software", "Media Buy", "Office", "Infrastructure", "Payroll Services"], i),
  amount: 120 + ((i * 233) % 5400),
  dueDate: `2026-08-${10 + (i % 18)}`,
  status: pick(["Draft", "Pending Approval", "Approved", "Paid", "Overdue"], i),
  submittedBy: pick(employees, (i + 2) % 12).name,
  department: pick(departments, i),
}));

export const documents = Array.from({ length: 16 }, (_, i) => ({
  id: `DOC-${700 + i}`,
  name: pick(
    ["Employee Handbook 2026.pdf", "Carrier Appointment – Ambetter.pdf", "QA Rubric v4.pdf", "W-9 Publisher.pdf", "Commission Plan.pdf", "HIPAA Policy.pdf"],
    i,
  ),
  category: pick(["HR", "Compliance", "Carrier", "Finance", "Operations"], i),
  owner: pick(employees, (i + 4) % 12).name,
  updated: `2026-0${(i % 8) + 1}-1${i % 9}`,
  size: `${(0.3 + (i % 9) * 0.7).toFixed(1)} MB`,
  access: pick(["All Employees", "Managers", "HR Only", "Executive"], i),
  version: `v${1 + (i % 5)}.${i % 4}`,
}));

export const auditLogs = Array.from({ length: 30 }, (_, i) => ({
  id: `AUD-${5000 + i}`,
  actor: pick(employees, i % 14).name,
  action: pick(
    ["Updated policy", "Approved payroll", "Corrected attendance event", "Changed user role", "Exported report", "Deleted callback"],
    i,
  ),
  recordType: pick(["Policy", "Payroll", "Attendance", "User", "Report", "Callback"], i),
  recordId: `REC-${1000 + i * 7}`,
  reason: i % 3 === 0 ? "Manager correction after review" : "—",
  ip: `10.4.${i % 12}.${20 + i}`,
  timestamp: `2026-08-03 ${8 + (i % 9)}:${(i * 13) % 60 < 10 ? "0" : ""}${(i * 13) % 60}`,
}));

export const leaveRequests = Array.from({ length: 16 }, (_, i) => ({
  id: `LV-${200 + i}`,
  employee: pick(employees, i % 14).name,
  type: pick(["PTO", "Sick", "Unpaid", "Bereavement", "Jury Duty"], i),
  startDate: `2026-08-${8 + (i % 16)}`,
  endDate: `2026-08-${10 + (i % 16)}`,
  days: 1 + (i % 5),
  balance: 6 + (i % 10),
  status: pick(["Pending", "Approved", "Denied", "Cancelled"], i),
  approver: "Nadia Rahimi",
  reason: "Family commitment",
}));

export const chargebacks = Array.from({ length: 12 }, (_, i) => ({
  id: `CHB-${150 + i}`,
  policyNumber: pick(policies, i).policyNumber,
  customer: pick(policies, i).customer,
  agent: pick(policies, i).agent,
  carrier: pick(policies, i).carrier,
  amount: 60 + ((i * 47) % 340),
  reason: pick(["Cancelled before effectuation", "Non-payment", "Carrier rejection", "Duplicate enrollment"], i),
  month: "August 2026",
  status: pick(["Pending", "Recovered", "Written Off", "Disputed"], i),
}));

export const shiftTimeline = [
  { time: "07:00", event: "Sign In", detail: "CRM · CallTools · Google Meet confirmed", tone: "success" },
  { time: "07:04", event: "Available", detail: "Ready for calls", tone: "info" },
  { time: "07:12", event: "On Call", detail: "CT-480021 · Rosa Ibarra", tone: "brand" },
  { time: "07:26", event: "Post Call", detail: "Disposition: Callback Scheduled", tone: "muted" },
  { time: "09:00", event: "Break", detail: "Allowance 15 minutes", tone: "warning" },
  { time: "09:16", event: "Back", detail: "1 minute over allowance", tone: "danger" },
  { time: "11:00", event: "Lunch", detail: "Allowance 30 minutes", tone: "warning" },
  { time: "11:29", event: "Back", detail: "Within allowance", tone: "success" },
  { time: "13:30", event: "Break", detail: "Allowance 15 minutes", tone: "warning" },
];

export const salesTrend = [
  { day: "Mon", sales: 14, calls: 182, paid: 96 },
  { day: "Tue", sales: 19, calls: 210, paid: 118 },
  { day: "Wed", sales: 12, calls: 168, paid: 88 },
  { day: "Thu", sales: 22, calls: 240, paid: 141 },
  { day: "Fri", sales: 26, calls: 258, paid: 160 },
  { day: "Sat", sales: 9, calls: 96, paid: 44 },
  { day: "Sun", sales: 6, calls: 71, paid: 30 },
];

export const revenueTrend = [
  { month: "Mar", revenue: 184000, cost: 121000 },
  { month: "Apr", revenue: 201000, cost: 128000 },
  { month: "May", revenue: 226000, cost: 139000 },
  { month: "Jun", revenue: 243000, cost: 147000 },
  { month: "Jul", revenue: 268000, cost: 152000 },
  { month: "Aug", revenue: 291000, cost: 158000 },
];

// Keep the demo dataset aligned with the live calendar (see data-clock.ts) so
// every "Today / Yesterday / Last 7 days" filter resolves against real rows.
rebaseRows(calls);
rebaseRows(callbacks);
rebaseRows(policies);
rebaseRows(qaReviews);
rebaseRows(customers);
rebaseRows(employees);
rebaseRows(tasks);
