import { AppShell } from "@/components/AppShell";
import { isSupabaseConfigured } from "@/lib/env";
import { getDashboardProfile } from "@/lib/profile-data";
import { debugLog, startServerTimer } from "@/lib/perf";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const stopLayoutTimer = startServerTimer("dashboard_layout_time");
  let profile = undefined;
  if (isSupabaseConfigured()) {
    const { user, profile: dashboardProfile } = await getDashboardProfile();

    if (!user) {
      console.warn("[AUTH] dashboard_layout_redirect_login_reason", {
        reason: "no_user_session",
        path: "/dashboard",
      });
      console.warn("[AUTH] redirect_to_login_reason", { reason: "dashboard_layout_user_missing", path: "/dashboard" });
      console.warn("[AUTH] dashboard_route_redirect_login", { path: "/dashboard" });
      stopLayoutTimer({ result: "redirect_login" });
      redirect("/login?next=/dashboard");
    }

    debugLog("AUTH", "dashboard_layout_user_id", { user_id: user.id });
    debugLog("AUTH", "dashboard_route_allowed", { path: "/dashboard", user_id: user.id });

    try {
      profile = dashboardProfile || undefined;
    } catch (error: any) {
      console.error("[DASHBOARD_LAYOUT] load_failed", { error: error?.message || error });
    }
  }

  stopLayoutTimer({ result: "render" });
  return <AppShell profile={profile}>{children}</AppShell>;
}
