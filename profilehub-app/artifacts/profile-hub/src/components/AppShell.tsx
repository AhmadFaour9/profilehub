"use client";

import { ReactNode, useState } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { Topbar } from "./Topbar";
import type { Profile } from "@/modules/shared";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function AppShell({ children, profile }: { children: ReactNode; profile?: Profile }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background flex flex-col md:flex-row">
      <DashboardSidebar />
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
          <DashboardSidebar variant="mobile" onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar profile={profile} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
