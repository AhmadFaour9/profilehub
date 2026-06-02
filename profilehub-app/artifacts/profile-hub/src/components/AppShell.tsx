import { ReactNode } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { Topbar } from "./Topbar";
import { DashboardSessionGuard } from "./DashboardSessionGuard";
import type { Profile } from "@/modules/shared";

export function AppShell({ children, profile }: { children: ReactNode; profile?: Profile }) {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar profile={profile} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <DashboardSessionGuard>{children}</DashboardSessionGuard>
        </main>
      </div>
    </div>
  );
}
