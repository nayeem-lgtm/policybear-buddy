/**
 * Policy Bear — HR dataset.
 *
 * The roster, hours and payroll-linked attendance below come from the company
 * workbooks (Agent Master + weekly Payroll & Costs). Support-staff records and
 * request queues are seeded demo rows until the HR API is connected.
 */

import { agentMaster, payrollWeeks, HOURLY_RATE } from "@/lib/company-data";

export type StaffDepartment =
  | "Sales"
  | "Quality Control"
  | "Human Resources"
  | "Accounting"
  | "Operations"
  | "Executive";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  department: StaffDepartment;
  title: string;
  employmentType: "Full-time" | "Part-time" | "Contractor";
  status: "Active" | "Onboarding" | "On Leave" | "Inactive";
  hourlyRate: number;
  hireDate: string;
  manager: string;
  phone: string;
  shift: string;
  timeZone: string;
  licensedStates: string[];
  source: "Workbook" | "Demo";
}

const initials = (n: string) =>
  n
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

export const staff: StaffMember[] = [
  ...agentMaster.map((a, i) => ({
    id: a.id,
    name: a.name,
    email: `${a.name.toLowerCase().replace(/\s+/g, ".")}@policybear.com`,
    department: "Sales" as StaffDepartment,
    title: "Licensed Final Expense Agent",
    employmentType: "Full-time" as const,
    status: "Active" as const,
    hourlyRate: a.hourlyRate,
    hireDate: ["2026-05-18", "2026-07-07", "2026-07-07"][i] ?? "2026-07-07",
    manager: "Operations Manager",
    phone: `+1 (469) 555-01${10 + i}`,
    shift: "07:00 – 16:00 Pacific",
    timeZone: "America/Los_Angeles",
    licensedStates: a.states,
    source: "Workbook" as const,
  })),
  {
    id: "ST-101",
    name: "Ariana Bell",
    email: "ariana.bell@policybear.com",
    department: "Human Resources",
    title: "HR Manager",
    employmentType: "Full-time",
    status: "Active",
    hourlyRate: 24,
    hireDate: "2026-04-06",
    manager: "Chief Executive Officer",
    phone: "+1 (469) 555-0201",
    shift: "07:00 – 16:00 Pacific",
    timeZone: "America/Los_Angeles",
    licensedStates: [],
    source: "Demo",
  },
  {
    id: "ST-102",
    name: "Devon Marsh",
    email: "devon.marsh@policybear.com",
    department: "Accounting",
    title: "Accounting Analyst",
    employmentType: "Full-time",
    status: "Active",
    hourlyRate: 26,
    hireDate: "2026-04-20",
    manager: "Chief Executive Officer",
    phone: "+1 (469) 555-0202",
    shift: "07:00 – 16:00 Pacific",
    timeZone: "America/Los_Angeles",
    licensedStates: [],
    source: "Demo",
  },
  {
    id: "ST-103",
    name: "Marisol Vega",
    email: "marisol.vega@policybear.com",
    department: "Quality Control",
    title: "Paid Call QA Analyst",
    employmentType: "Full-time",
    status: "Active",
    hourlyRate: 20,
    hireDate: "2026-05-04",
    manager: "Operations Manager",
    phone: "+1 (469) 555-0203",
    shift: "08:00 – 17:00 Pacific",
    timeZone: "America/Los_Angeles",
    licensedStates: [],
    source: "Demo",
  },
  {
    id: "ST-104",
    name: "Owen Klein",
    email: "owen.klein@policybear.com",
    department: "Operations",
    title: "Operations Manager",
    employmentType: "Full-time",
    status: "Active",
    hourlyRate: 30,
    hireDate: "2026-03-16",
    manager: "Chief Executive Officer",
    phone: "+1 (469) 555-0204",
    shift: "07:00 – 16:00 Pacific",
    timeZone: "America/Los_Angeles",
    licensedStates: [],
    source: "Demo",
  },
  {
    id: "ST-105",
    name: "Jordan Pryce",
    email: "ceo@policybear.com",
    department: "Executive",
    title: "Chief Executive Officer",
    employmentType: "Full-time",
    status: "Active",
    hourlyRate: 0,
    hireDate: "2026-01-05",
    manager: "—",
    phone: "+1 (469) 555-0200",
    shift: "Flexible",
    timeZone: "America/Los_Angeles",
    licensedStates: [],
    source: "Demo",
  },
];

export const staffInitials = (name: string) => initials(name);

/* ------------------------------------------------------- attendance (payroll) */

export interface AttendanceDay {
  id: string;
  date: string;
  weekStart: string;
  employee: string;
  scheduledHours: number;
  workedHours: number;
  clockIn: string | null;
  clockOut: string | null;
  breakMinutes: number;
  lunchMinutes: number;
  status: "Present" | "Short Hours" | "Absent" | "Partial Day";
  source: "Payroll workbook";
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function addDays(iso: string, n: number) {
  const dt = new Date(`${iso}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Spread each payroll week's paid hours across Mon–Fri to make a day grid. */
export const attendanceDays: AttendanceDay[] = payrollWeeks.flatMap((w, wi) => {
  let remaining = w.paidHours;
  return WEEKDAYS.map((_, di) => {
    const planned = Math.min(8, Math.max(0, Math.round((remaining - 0) * 10) / 10));
    const worked = Math.min(8, planned);
    remaining = Math.max(0, remaining - worked);
    const status: AttendanceDay["status"] =
      worked === 0 ? "Absent" : worked >= 8 ? "Present" : worked >= 6 ? "Short Hours" : "Partial Day";
    const clockIn = worked === 0 ? null : "07:00";
    const clockOut =
      worked === 0
        ? null
        : `${String(7 + Math.floor(worked + 1)).padStart(2, "0")}:${worked % 1 ? "30" : "00"}`;
    return {
      id: `AT-${wi + 1}-${di + 1}`,
      date: addDays(w.weekStart, di + 1),
      weekStart: w.weekStart,
      employee: w.agent,
      scheduledHours: 8,
      workedHours: Math.round(worked * 10) / 10,
      clockIn,
      clockOut,
      breakMinutes: worked === 0 ? 0 : 15,
      lunchMinutes: worked === 0 ? 0 : 30,
      status,
      source: "Payroll workbook" as const,
    };
  });
});

/* ------------------------------------------------------------ exceptions */

export interface AttendanceException {
  id: string;
  date: string;
  employee: string;
  type:
    | "Late Sign-In"
    | "Break Overrun"
    | "Lunch Overrun"
    | "Missed Sign-Out"
    | "Unpaid Absence"
    | "Short Hours";
  detail: string;
  minutes: number;
  payrollImpact: number;
  status: "Open" | "Acknowledged" | "Excused" | "Deducted";
  raisedBy: string;
}

const shortDays = attendanceDays.filter((d) => d.status !== "Present").slice(0, 14);

export const attendanceExceptions: AttendanceException[] = shortDays.map((d, i) => {
  const type = (
    ["Short Hours", "Break Overrun", "Late Sign-In", "Lunch Overrun", "Missed Sign-Out", "Unpaid Absence"] as const
  )[i % 6]!;
  const minutes = type === "Unpaid Absence" ? 480 : 6 + ((i * 7) % 34);
  return {
    id: `EX-${300 + i}`,
    date: d.date,
    employee: d.employee,
    type,
    detail:
      type === "Short Hours"
        ? `Worked ${d.workedHours}h of 8h scheduled`
        : type === "Unpaid Absence"
          ? "No sign-in recorded for the scheduled shift"
          : `${minutes} minutes over allowance`,
    minutes,
    payrollImpact: Math.round((minutes / 60) * HOURLY_RATE * 100) / 100,
    status: (["Open", "Acknowledged", "Excused", "Deducted"] as const)[i % 4]!,
    raisedBy: i % 3 === 0 ? "Break alarm automation" : "HR review",
  };
});

/* ----------------------------------------------------------- leave requests */

export interface LeaveRequest {
  id: string;
  employee: string;
  type: "PTO" | "Sick" | "Unpaid" | "Bereavement" | "Jury Duty";
  startDate: string;
  endDate: string;
  days: number;
  balanceRemaining: number;
  status: "Pending" | "Approved" | "Denied" | "Cancelled";
  approver: string;
  reason: string;
  submittedAt: string;
}

export const leaveRequestsHr: LeaveRequest[] = [
  { id: "LV-401", employee: "Tracy Hopkins", type: "PTO", startDate: "2026-08-10", endDate: "2026-08-11", days: 2, balanceRemaining: 6, status: "Pending", approver: "Ariana Bell", reason: "Family commitment", submittedAt: "2026-08-03" },
  { id: "LV-402", employee: "Keith Pilson", type: "Sick", startDate: "2026-08-05", endDate: "2026-08-05", days: 1, balanceRemaining: 4, status: "Approved", approver: "Ariana Bell", reason: "Medical appointment", submittedAt: "2026-08-04" },
  { id: "LV-403", employee: "Kelly SimmonWilliams", type: "Unpaid", startDate: "2026-08-17", endDate: "2026-08-19", days: 3, balanceRemaining: 0, status: "Pending", approver: "Ariana Bell", reason: "Personal travel", submittedAt: "2026-08-02" },
  { id: "LV-404", employee: "Marisol Vega", type: "PTO", startDate: "2026-08-24", endDate: "2026-08-28", days: 5, balanceRemaining: 3, status: "Pending", approver: "Owen Klein", reason: "Vacation", submittedAt: "2026-07-30" },
  { id: "LV-405", employee: "Devon Marsh", type: "Bereavement", startDate: "2026-07-27", endDate: "2026-07-29", days: 3, balanceRemaining: 8, status: "Approved", approver: "Ariana Bell", reason: "Family bereavement", submittedAt: "2026-07-26" },
  { id: "LV-406", employee: "Keith Pilson", type: "PTO", startDate: "2026-07-13", endDate: "2026-07-14", days: 2, balanceRemaining: 6, status: "Denied", approver: "Ariana Bell", reason: "Overlaps carrier training", submittedAt: "2026-07-09" },
  { id: "LV-407", employee: "Owen Klein", type: "Jury Duty", startDate: "2026-08-31", endDate: "2026-09-01", days: 2, balanceRemaining: 10, status: "Pending", approver: "Jordan Pryce", reason: "Court summons", submittedAt: "2026-08-04" },
];

/* ------------------------------------------------------------ hour requests */

export interface HourRequest {
  id: string;
  employee: string;
  date: string;
  type: "Extra Hours" | "Overtime" | "Shift Swap" | "Missed Punch" | "Early Sign-Out";
  requestedHours: number;
  hourlyRate: number;
  costImpact: number;
  reason: string;
  status: "Pending" | "Approved" | "Denied";
  approver: string;
}

const hourRequestSeed: Array<[string, string, HourRequest["type"], number, string, HourRequest["status"]]> = [
  ["Tracy Hopkins", "2026-08-06", "Extra Hours", 4, "Cover afternoon Ringba volume", "Pending"],
  ["Keith Pilson", "2026-08-05", "Missed Punch", 1.5, "Forgot to clock out after callback block", "Pending"],
  ["Kelly SimmonWilliams", "2026-08-04", "Overtime", 2, "Finish two applications with carrier", "Approved"],
  ["Tracy Hopkins", "2026-07-31", "Early Sign-Out", 4.5, "Left early — internet outage", "Approved"],
  ["Keith Pilson", "2026-07-28", "Shift Swap", 8, "Swap Friday shift with Kelly", "Denied"],
  ["Kelly SimmonWilliams", "2026-08-07", "Extra Hours", 3, "Saturday callback clean-up", "Pending"],
];

export const hourRequests: HourRequest[] = hourRequestSeed.map(([employee, date, type, hours, reason, status], i) => ({
  id: `HR-${500 + i}`,
  employee,
  date,
  type,
  requestedHours: hours,
  hourlyRate: HOURLY_RATE,
  costImpact: Math.round(hours * HOURLY_RATE * 100) / 100,
  reason,
  status,
  approver: "Ariana Bell",
}));

/* ---------------------------------------------------------- HR automations */

export interface HrAutomation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  owner: string;
  category: "Attendance" | "Payroll" | "Onboarding" | "Compliance" | "Training";
  enabled: boolean;
  lastRun: string;
  runsThisMonth: number;
}

export const hrAutomations: HrAutomation[] = [
  { id: "AU-901", name: "Break overrun alarm", trigger: "Break exceeds 15 minutes", action: "Red screen + siren, auto-call the agent, log exception", owner: "HR", category: "Attendance", enabled: true, lastRun: "2026-08-05 11:18", runsThisMonth: 14 },
  { id: "AU-902", name: "Lunch overrun escalation", trigger: "Lunch exceeds 30 minutes by 5+ min", action: "Notify HR and Operations, add to exception queue", owner: "HR", category: "Attendance", enabled: true, lastRun: "2026-08-05 12:41", runsThisMonth: 6 },
  { id: "AU-903", name: "Missing sign-out sweep", trigger: "No sign-out by 17:00 Pacific", action: "Close the shift at scheduled end and flag for review", owner: "HR", category: "Attendance", enabled: true, lastRun: "2026-08-04 17:00", runsThisMonth: 3 },
  { id: "AU-904", name: "Weekly Gusto hours export", trigger: "Every Monday 06:00 Pacific", action: "Push approved paid hours to Gusto payroll", owner: "Accounting", category: "Payroll", enabled: true, lastRun: "2026-08-03 06:00", runsThisMonth: 1 },
  { id: "AU-905", name: "Commission tier recalculation", trigger: "Valid sale count changes", action: "Re-apply commission tier and update end-month payable", owner: "Accounting", category: "Payroll", enabled: true, lastRun: "2026-08-04 21:12", runsThisMonth: 28 },
  { id: "AU-906", name: "Licence expiry watch", trigger: "State licence expires in 30 days", action: "Email agent + HR and open a compliance task", owner: "HR", category: "Compliance", enabled: true, lastRun: "2026-08-01 08:00", runsThisMonth: 2 },
  { id: "AU-907", name: "Onboarding checklist", trigger: "New hire added to roster", action: "Create CallTools seat, CRM login and training plan", owner: "HR", category: "Onboarding", enabled: false, lastRun: "2026-07-07 09:30", runsThisMonth: 0 },
  { id: "AU-908", name: "Training completion reminder", trigger: "Course below 100% after 7 days", action: "Remind agent daily and notify HR at day 10", owner: "HR", category: "Training", enabled: true, lastRun: "2026-08-05 07:30", runsThisMonth: 11 },
  { id: "AU-909", name: "Unpaid absence deduction", trigger: "Absence marked unpaid by HR", action: "Deduct hours from the next weekly payroll run", owner: "Accounting", category: "Payroll", enabled: true, lastRun: "2026-07-31 16:20", runsThisMonth: 2 },
];

export const LEAVE_TYPES = ["PTO", "Sick", "Unpaid", "Bereavement", "Jury Duty"] as const;
export const HOUR_REQUEST_TYPES = ["Extra Hours", "Overtime", "Shift Swap", "Missed Punch", "Early Sign-Out"] as const;
