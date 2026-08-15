import { Link, useRouterState } from "@tanstack/react-router";

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
import { findSectionForPath, navSections } from "@/lib/navigation";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { can } = useAuth();

  const sections = navSections
    .map((section) => ({
      ...section,
      groups: section.groups
        .map((group) => ({ ...group, items: group.items.filter((i) => can(i.url)) }))
        .filter((group) => group.items.length > 0),
    }))
    .filter((section) => section.groups.length > 0);

  const activeId = findSectionForPath(pathname);
  const active = sections.find((s) => s.id === activeId) ?? sections[0];

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-3 border-b border-sidebar-border px-3 py-3">
        <Link to="/dashboard" className="flex h-9 items-center gap-2">
          <PolicyBearLogo tone="inverse" compact={collapsed} />
        </Link>

        <nav className={cn("grid gap-1", collapsed ? "grid-cols-1" : "grid-cols-2")}>
          {sections.map((section) => {
            const isActive = section.id === active?.id;
            const target = section.groups[0]?.items[0]?.url ?? section.home;
            return (
              <Link
                key={section.id}
                to={target}
                title={section.label}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition-all duration-200",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-brand"
                    : "bg-sidebar-accent/35 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <section.icon className="size-4 shrink-0" />
                {!collapsed && <span className="truncate">{section.label}</span>}
              </Link>
            );
          })}
        </nav>
      </SidebarHeader>

      <SidebarContent className="gap-0 pt-2">
        {!collapsed && active && (
          <p className="px-4 pb-2 text-[0.7rem] leading-snug text-sidebar-foreground/50">
            {active.tagline}
          </p>
        )}
        {active?.groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[0.65rem] tracking-[0.14em] uppercase text-sidebar-foreground/45">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.url || pathname.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link to={item.url} className="gap-2.5">
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
