import type { ReactNode } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { QuickActionButton } from "@/components/layout/QuickActionButton";
import { BreakAlarmOverlay } from "@/components/shift/BreakAlarmOverlay";
import { ShiftProvider } from "@/context/ShiftContext";
import { CallProvider } from "@/context/CallContext";
import { CallOverlay } from "@/components/messaging/CallOverlay";
import { useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { AccessDenied } from "@/components/auth/AccessDenied";

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, ready, can } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && !user) void navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  if (!ready || !user) return null;

  const allowed = can(pathname);

  return (
    <ShiftProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopHeader />
            <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6">
              {allowed ? children ?? <Outlet /> : <AccessDenied path={pathname} />}
            </main>
          </div>
        </div>
        <QuickActionButton />
        <BreakAlarmOverlay />
        <Toaster />
      </SidebarProvider>
    </ShiftProvider>
  );
}
