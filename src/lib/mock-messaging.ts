/**
 * Mock messaging data for the in-app chat & calling module.
 * Replace with API-backed data once the messaging service is live.
 */

export type ChatKind = "dm" | "group" | "channel";

export interface ChatMessage {
  id: string;
  author: string;
  initials: string;
  body: string;
  time: string;
  mine?: boolean;
  attachment?: { name: string; kind: "pdf" | "image" | "audio"; meta: string };
  system?: boolean;
  callSummary?: { direction: "outgoing" | "incoming"; duration: string; missed?: boolean };
}

export interface Conversation {
  id: string;
  name: string;
  kind: ChatKind;
  initials: string;
  presence: "online" | "away" | "break" | "offline";
  subtitle: string;
  unread: number;
  pinned?: boolean;
  muted?: boolean;
  lastAt: string;
  members: number;
  messages: ChatMessage[];
}

export const conversations: Conversation[] = [
  {
    id: "cnv-floor",
    name: "Sales Floor — Team Falcon",
    kind: "group",
    initials: "TF",
    presence: "online",
    subtitle: "Marcus: coverage looks good for the 2pm block",
    unread: 3,
    pinned: true,
    lastAt: "2:41 PM",
    members: 14,
    messages: [
      {
        id: "m1",
        author: "Marcus Hale",
        initials: "MH",
        body: "Morning team — queue depth is climbing, let's keep breaks staggered today.",
        time: "9:02 AM",
      },
      {
        id: "m2",
        author: "Amelia Carter",
        initials: "AC",
        body: "Copy. I'm off break at 9:15 and back on the dialer.",
        time: "9:04 AM",
        mine: true,
      },
      {
        id: "m3",
        author: "Leo Whitaker",
        initials: "LW",
        body: "QC note: two calls yesterday missed the recorded disclosure. Scorecards are in the QA queue.",
        time: "9:20 AM",
      },
      {
        id: "m4",
        author: "Dana Reyes",
        initials: "DR",
        body: "Attendance exceptions for Monday are cleared. Two break overruns went to coaching.",
        time: "11:48 AM",
        attachment: { name: "attendance-exceptions-mon.pdf", kind: "pdf", meta: "182 KB · PDF" },
      },
      {
        id: "m5",
        author: "Marcus Hale",
        initials: "MH",
        body: "Coverage looks good for the 2pm block. Anyone needing a swap, ping me before 1.",
        time: "2:41 PM",
      },
    ],
  },
  {
    id: "cnv-dana",
    name: "Dana Reyes",
    kind: "dm",
    initials: "DR",
    presence: "online",
    subtitle: "Can you confirm the PTO balance?",
    unread: 1,
    lastAt: "1:12 PM",
    members: 2,
    messages: [
      {
        id: "d1",
        author: "Dana Reyes",
        initials: "DR",
        body: "Hi Amelia — your leave request for the 22nd is approved.",
        time: "12:58 PM",
      },
      {
        id: "d2",
        author: "Amelia Carter",
        initials: "AC",
        body: "Thank you! Can you confirm the PTO balance after that day?",
        time: "1:05 PM",
        mine: true,
      },
      {
        id: "d3",
        author: "Dana Reyes",
        initials: "DR",
        body: "6.5 days remaining for the year.",
        time: "1:12 PM",
      },
      {
        id: "d4",
        author: "Dana Reyes",
        initials: "DR",
        body: "",
        time: "1:14 PM",
        callSummary: { direction: "incoming", duration: "4m 12s" },
      },
    ],
  },
  {
    id: "cnv-qc",
    name: "QC Pod A",
    kind: "group",
    initials: "QA",
    presence: "away",
    subtitle: "Leo: dispute SBM-4471 needs a second listen",
    unread: 0,
    lastAt: "12:30 PM",
    members: 6,
    messages: [
      {
        id: "q1",
        author: "Leo Whitaker",
        initials: "LW",
        body: "Dispute SBM-4471 needs a second listen — agent claims the disclosure was on the transfer leg.",
        time: "12:30 PM",
        attachment: { name: "call-4471.wav", kind: "audio", meta: "6m 02s · Recording" },
      },
    ],
  },
  {
    id: "cnv-announce",
    name: "#company-announcements",
    kind: "channel",
    initials: "#",
    presence: "online",
    subtitle: "Priya: CRM maintenance window Saturday 11pm",
    unread: 0,
    muted: true,
    lastAt: "Yesterday",
    members: 128,
    messages: [
      {
        id: "a1",
        author: "Priya Raman",
        initials: "PR",
        body: "Planned CRM maintenance window Saturday 11pm–1am ET. Dialer and quote engine stay online.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: "cnv-payroll",
    name: "Nadia Bloom",
    kind: "dm",
    initials: "NB",
    presence: "break",
    subtitle: "Commission statement is posted",
    unread: 0,
    lastAt: "Yesterday",
    members: 2,
    messages: [
      {
        id: "p1",
        author: "Nadia Bloom",
        initials: "NB",
        body: "Your July commission statement is posted — 18 effectuated policies, two pending clawbacks.",
        time: "Yesterday",
      },
      {
        id: "p2",
        author: "Amelia Carter",
        initials: "AC",
        body: "Reviewed, looks right. Thanks Nadia.",
        time: "Yesterday",
        mine: true,
      },
    ],
  },
  {
    id: "cnv-ops",
    name: "Marcus Hale",
    kind: "dm",
    initials: "MH",
    presence: "offline",
    subtitle: "Missed voice call",
    unread: 0,
    lastAt: "Mon",
    members: 2,
    messages: [
      {
        id: "o1",
        author: "Marcus Hale",
        initials: "MH",
        body: "",
        time: "Mon 4:40 PM",
        callSummary: { direction: "incoming", duration: "—", missed: true },
      },
      {
        id: "o2",
        author: "Marcus Hale",
        initials: "MH",
        body: "Call me when you're free about the callback SLA change.",
        time: "Mon 4:41 PM",
      },
    ],
  },
];

export interface CallLogEntry {
  id: string;
  party: string;
  initials: string;
  kind: "voice" | "video";
  direction: "incoming" | "outgoing";
  status: "Completed" | "Missed" | "Declined";
  duration: string;
  when: string;
}

export const internalCalls: CallLogEntry[] = [
  { id: "c1", party: "Dana Reyes", initials: "DR", kind: "voice", direction: "incoming", status: "Completed", duration: "4m 12s", when: "Today 1:14 PM" },
  { id: "c2", party: "QC Pod A", initials: "QA", kind: "video", direction: "outgoing", status: "Completed", duration: "18m 40s", when: "Today 11:05 AM" },
  { id: "c3", party: "Marcus Hale", initials: "MH", kind: "voice", direction: "incoming", status: "Missed", duration: "—", when: "Mon 4:40 PM" },
  { id: "c4", party: "Nadia Bloom", initials: "NB", kind: "voice", direction: "outgoing", status: "Completed", duration: "2m 05s", when: "Mon 10:22 AM" },
  { id: "c5", party: "Team Falcon standup", initials: "TF", kind: "video", direction: "incoming", status: "Declined", duration: "—", when: "Fri 9:00 AM" },
];
