import {
  Activity,
  AlarmClock,
  AlertTriangle,
  Banknote,
  BarChart3,
  Bell,
  BellRing,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Contact,
  CreditCard,
  Database,
  FileStack,
  FileText,
  Gauge,
  Headphones,
  Home,
  Inbox,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Newspaper,
  PhoneCall,
  PhoneForwarded,
  Plug,
  Radio,
  ReceiptText,
  Repeat,
  ScrollText,
  Search,
  ShieldCheck,
  ShieldOff,
  Siren,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserCog,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: typeof Home;
  description?: string;
}

export interface NavSubGroup {
  label: string;
  items: NavItem[];
}

export interface NavSection {
  id: "operation" | "agent" | "publisher" | "finance" | "other";
  label: string;
  tagline: string;
  icon: typeof Home;
  home: string;
  groups: NavSubGroup[];
}

export const navSections: NavSection[] = [
  {
    id: "operation",
    label: "Operation",
    tagline: "Daily ops, live floor, tasks and automation",
    icon: Activity,
    home: "/operations",
    groups: [
      {
        label: "Daily ops",
        items: [
          { title: "Daily Operations", url: "/operations", icon: Activity, description: "Day-to-day operations hub" },
          { title: "Live Operations", url: "/live-operations", icon: Radio, description: "Real-time floor view" },
          { title: "Tasks & Approvals", url: "/tasks", icon: ClipboardCheck, description: "Approvals and task queue" },
          { title: "Incidents", url: "/incidents", icon: Siren, description: "Incident log and response" },
        ],
      },
      {
        label: "Automation",
        items: [
          { title: "Automations", url: "/automations", icon: Workflow, description: "Workflow automations" },
          { title: "HR Automations", url: "/hr-automations", icon: Workflow, description: "People process automations" },
        ],
      },
    ],
  },
  {
    id: "agent",
    label: "Agent",
    tagline: "Shift, attendance and the calling desk",
    icon: Headphones,
    home: "/dashboard",
    groups: [
      {
        label: "Daily work",
        items: [
          { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, description: "Your day at a glance" },
          { title: "Agent Desk", url: "/agent-desk", icon: Headphones, description: "Take and handle calls" },
          { title: "My Work", url: "/my-work", icon: ClipboardList, description: "Everything assigned to you" },
          { title: "Customers", url: "/customers", icon: Contact, description: "Customer records" },
          { title: "Callbacks", url: "/callbacks", icon: PhoneForwarded, description: "Callback queue" },
          { title: "Callback Calendar", url: "/callbacks/calendar", icon: CalendarDays, description: "Scheduled callbacks" },
          { title: "DNC & Compliance", url: "/dnc", icon: ShieldOff, description: "Do-Not-Call list, add numbers and audit log" },
        ],
      },
      {
        label: "Attendance",
        items: [
          { title: "My Shift", url: "/my-shift", icon: AlarmClock, description: "Clock in, breaks, shift status" },
          { title: "Break Alarm", url: "/break-alarm", icon: BellRing, description: "Break timers and alerts" },
          { title: "Attendance", url: "/attendance", icon: CalendarClock, description: "Attendance records" },
          { title: "Leave", url: "/leave", icon: CalendarDays, description: "Time off requests" },
        ],
      },
      {
        label: "Growth",
        items: [
          { title: "Quotes", url: "/quotes", icon: Sparkles, description: "Pull and compare quotes" },
          { title: "Sales", url: "/sales", icon: FileStack, description: "Your sales and policies" },
        ],
      },
    ],
  },
  {
    id: "publisher",
    label: "Publisher",
    tagline: "Traffic, calls delivered, conversion and QA",
    icon: Building2,
    home: "/publishers",
    groups: [
      {
        label: "Traffic",
        items: [
          { title: "Dashboard", url: "/publishers", icon: Building2, description: "Publisher overview" },
          { title: "Reporting", url: "/reporting", icon: BarChart3, description: "Full call and revenue report" },
          { title: "Calls", url: "/calls", icon: PhoneCall, description: "All calls received" },

        ],
      },
      {
        label: "Quality & recordings",
        items: [
          { title: "QA Reviews", url: "/qa", icon: ShieldCheck, description: "Score call recordings" },
          { title: "Reporting", url: "/qa/reporting", icon: BarChart3, description: "Publisher sales reporting" },
          { title: "Escalations", url: "/qa/escalations", icon: AlertTriangle, description: "Disputes and quality tickets" },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    tagline: "Money in, money out",
    icon: Wallet,
    home: "/revenue",
    groups: [
      {
        label: "Money",
        items: [
          { title: "Revenue", url: "/revenue", icon: BarChart3, description: "Income overview" },
          { title: "Payroll", url: "/payroll", icon: Wallet, description: "Staff pay runs" },
          { title: "Commissions", url: "/commissions", icon: Banknote, description: "Agent commissions" },
          { title: "Chargebacks", url: "/chargebacks", icon: CreditCard, description: "Reversed payments" },
          { title: "Expenses", url: "/expenses", icon: ReceiptText, description: "Company spending" },
        ],
      },
    ],
  },
  {
    id: "other",
    label: "Other",
    tagline: "Communication, people, reports and admin",
    icon: SlidersHorizontal,
    home: "/feed",
    groups: [
      {
        label: "Communication",
        items: [
          { title: "Company Feed", url: "/feed", icon: Newspaper },
          { title: "Announcements", url: "/announcements", icon: Megaphone },
          { title: "Messages", url: "/messages", icon: MessageSquare },
          { title: "Texting", url: "/texting", icon: MessageCircle },
          { title: "Notifications", url: "/notifications", icon: Bell },
          { title: "Search", url: "/search", icon: Search },
        ],
      },
      {
        label: "People & reports",
        items: [
          { title: "Employees", url: "/employees", icon: Users },
          { title: "Complaints & Tips", url: "/complaints", icon: Inbox },
          { title: "Reports", url: "/reports", icon: BarChart3 },
          { title: "Documents", url: "/documents", icon: FileText },
          { title: "New Application", url: "/sales/new", icon: ClipboardCheck },
        ],
      },
      {
        label: "Admin",
        items: [
          { title: "Users & Roles", url: "/admin/users", icon: UserCog },
          { title: "Business Rules", url: "/admin/rules", icon: SlidersHorizontal },
          { title: "Integrations", url: "/admin/integrations", icon: Plug },
          { title: "Phone System", url: "/admin/phone-system", icon: PhoneCall },
          { title: "Telephony Sync", url: "/admin/telephony", icon: Repeat },
          { title: "CallTools Control", url: "/admin/calltools", icon: Headphones },
          { title: "Import Center", url: "/admin/imports", icon: Database },
          { title: "Audit Logs", url: "/admin/audit", icon: ScrollText },
          { title: "System Health", url: "/admin/health", icon: Gauge },
        ],
      },
    ],
  },
];

export function findSectionForPath(pathname: string): NavSection["id"] {
  let best: { id: NavSection["id"]; len: number } | null = null;
  for (const section of navSections) {
    for (const group of section.groups) {
      for (const item of group.items) {
        if (pathname === item.url || pathname.startsWith(item.url + "/")) {
          if (!best || item.url.length > best.len) best = { id: section.id, len: item.url.length };
        }
      }
    }
  }
  return best?.id ?? "agent";
}
