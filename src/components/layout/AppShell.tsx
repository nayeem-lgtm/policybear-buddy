import type { ReactNode } from "react";
import { Outlet } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { QuickActionButton } from "@/components/layout/QuickActionButton";
import { BreakAlarmOverlay } from "@/components/shift/BreakAlarmOverlay";
import { ShiftProvider } from "@/context/ShiftContext";
import { Toaster } from "@/components/ui/sonner";

export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <ShiftProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopHeader />
            <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6">
              {children ?? <Outlet />}
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
