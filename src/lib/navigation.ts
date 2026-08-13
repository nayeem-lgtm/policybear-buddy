import {
  Activity,
  AlarmClock,
  BadgeDollarSign,
  Banknote,
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
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
  GraduationCap,
  Headphones,
  HeartHandshake,
  Home,
  Import,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
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
  id: "agent" | "publisher" | "finance" | "other";
  label: string;
  tagline: string;
  icon: typeof Home;
  home: string;
  groups: NavSubGroup[];
}

export const navSections: NavSection[] = [
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
        ],
      },
      {
        label: "Attendance",
        items: [
          { title: "My Shift", url: "/my-shift", icon: AlarmClock, description: "Clock in, breaks, shift status" },
          { title: "Break Alarm", url: "/break-alarm", icon: BellRing, description: "Break timers and alerts" },
          { title: "Attendance", url: "/attendance", icon: CalendarClock, description: "Attendance records" },
          { title: "Exceptions", url: "/attendance-exceptions", icon: Siren, description: "Late, absent, missed breaks" },
          { title: "Leave", url: "/leave", icon: CalendarDays, description: "Time off requests" },
        ],
      },
      {
        label: "Growth",
        items: [
          { title: "Coaching", url: "/coaching", icon: GraduationCap, description: "Feedback sessions" },
          { title: "Training", url: "/training", icon: BookOpen, description: "Courses and certifications" },
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
          { title: "Publishers", url: "/publishers", icon: Building2, description: "Who sends the calls" },
          { title: "Campaigns", url: "/campaigns", icon: Target, description: "Campaign performance" },
          { title: "Calls", url: "/calls", icon: PhoneCall, description: "All calls received" },
          { title: "Source Attribution", url: "/telephony-attribution", icon: Repeat, description: "Which source sent what" },
        ],
      },
      {
        label: "Conversion",
        items: [
          { title: "Sales Conversion", url: "/sales", icon: FileStack, description: "Calls turned into sales" },
          { title: "Retention", url: "/retention", icon: HeartHandshake, description: "Keeping customers" },
          { title: "Reconciliation", url: "/call-reconciliation", icon: Repeat, description: "Match calls to billing" },
          { title: "Cost & Returns", url: "/call-costs", icon: BadgeDollarSign, description: "Cost per call vs revenue" },
        ],
      },
      {
        label: "Quality & recordings",
        items: [
          { title: "QA Reviews", url: "/qa", icon: ShieldCheck, description: "Score call recordings" },
          { title: "QA Import", url: "/qa/import", icon: Import, description: "Bulk import for review" },
          { title: "Disputes", url: "/qa/disputes", icon: LifeBuoy, description: "Challenge a score or call" },
          { title: "Live Call Monitor", url: "/telephony-monitor", icon: Radio, description: "Listen in live" },
          { title: "Live Floor", url: "/telephony-floor", icon: Activity, description: "Floor activity right now" },
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
        label: "People & operations",
        items: [
          { title: "Employees", url: "/employees", icon: Users },
          { title: "Complaints & Tips", url: "/complaints", icon: Inbox },
          { title: "HR Automations", url: "/hr-automations", icon: Workflow },
          { title: "Automations", url: "/automations", icon: Workflow },
          { title: "Daily Operations", url: "/operations", icon: Activity },
          { title: "Live Operations", url: "/live-operations", icon: Radio },
          { title: "Tasks & Approvals", url: "/tasks", icon: ClipboardCheck },
          { title: "Incidents", url: "/incidents", icon: Siren },
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
