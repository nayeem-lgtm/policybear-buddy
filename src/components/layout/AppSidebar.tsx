import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlarmClock,
  BellRing,
  BadgeDollarSign,
  Banknote,
  BarChart3,
  Bell,
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
  HeartHandshake,
  Home,
  Import,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  PhoneCall,
  PhoneForwarded,
  Plug,
  Radio,
  ReceiptText,
  Repeat,
  Search,
  ScrollText,
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

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { PolicyBearLogo } from "@/components/brand/PolicyBearLogo";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: typeof Home;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "My Work", url: "/my-work", icon: ClipboardList },
      { title: "Notifications", url: "/notifications", icon: Bell },
      { title: "Search", url: "/search", icon: Search },
      { title: "Messages", url: "/messages", icon: MessageSquare },
      { title: "Announcements", url: "/announcements", icon: Megaphone },
    ],
  },
  {
    label: "Attendance",
    items: [
      { title: "My Shift", url: "/my-shift", icon: AlarmClock },
      { title: "Live Operations", url: "/live-operations", icon: Radio },
      { title: "HR Attendance", url: "/attendance", icon: CalendarClock },
      { title: "Exceptions", url: "/attendance-exceptions", icon: Siren },
      { title: "Break Alarm Control", url: "/break-alarm", icon: BellRing },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { title: "Customers", url: "/customers", icon: Contact },
      { title: "Calls", url: "/calls", icon: PhoneCall },
      { title: "Reconciliation", url: "/call-reconciliation", icon: Repeat },
      { title: "Cost & Returns", url: "/call-costs", icon: BadgeDollarSign },
      { title: "Callback Queue", url: "/callbacks", icon: PhoneForwarded },
      { title: "Callback Calendar", url: "/callbacks/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Quote Engine", url: "/quotes", icon: Sparkles },
      { title: "Sales & Policies", url: "/sales", icon: FileStack },
      { title: "New Application", url: "/sales/new", icon: ClipboardCheck },
      { title: "Retention", url: "/retention", icon: HeartHandshake },
    ],
  },
  {
    label: "Quality Control",
    items: [
      { title: "QA Queue", url: "/qa", icon: ShieldCheck },
      { title: "Smart QC Import", url: "/qa/import", icon: Import },
      { title: "Disputes", url: "/qa/disputes", icon: LifeBuoy },
    ],
  },
  {
    label: "Traffic",
    items: [
      { title: "Publishers", url: "/publishers", icon: Building2 },
      { title: "Campaigns", url: "/campaigns", icon: Target },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Employees", url: "/employees", icon: Users },
      { title: "Leave Center", url: "/leave", icon: CalendarDays },
      { title: "Complaints & Tips", url: "/complaints", icon: Inbox },
      { title: "Coaching", url: "/coaching", icon: GraduationCap },
      { title: "Training Academy", url: "/training", icon: BookOpen },
      { title: "HR Automations", url: "/automations", icon: Workflow },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Payroll", url: "/payroll", icon: Wallet },
      { title: "Commissions", url: "/commissions", icon: Banknote },
      { title: "Chargebacks", url: "/chargebacks", icon: CreditCard },
      { title: "Expenses", url: "/expenses", icon: ReceiptText },
      { title: "Revenue", url: "/revenue", icon: BarChart3 },
    ],
  },
  {
    label: "Control",
    items: [
      { title: "Daily Operations", url: "/operations", icon: Activity },
      { title: "Report Center", url: "/reports", icon: BarChart3 },
      { title: "Tasks & Approvals", url: "/tasks", icon: ClipboardCheck },
      { title: "Incidents", url: "/incidents", icon: Siren },
      { title: "Documents", url: "/documents", icon: FileText },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Users & Roles", url: "/admin/users", icon: UserCog },
      { title: "Business Rules", url: "/admin/rules", icon: SlidersHorizontal },
      { title: "Integrations", url: "/admin/integrations", icon: Plug },
      { title: "Import Center", url: "/admin/imports", icon: Database },
      { title: "Audit Logs", url: "/admin/audit", icon: ScrollText },
      { title: "System Health", url: "/admin/health", icon: Gauge },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { can } = useAuth();

  // Role-based navigation: hide whole groups the current role cannot open.
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => can(item.url)) }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <PolicyBearLogo tone="inverse" compact={collapsed} />
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[0.65rem] tracking-[0.14em] uppercase text-sidebar-foreground/45">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active =
                    pathname === item.url || pathname.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url} className={cn("gap-2.5")}>
                          <item.icon className="size-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
