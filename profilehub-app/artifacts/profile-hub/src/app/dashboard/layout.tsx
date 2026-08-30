import { AppShell } from "@/components/AppShell";
import { isSupabaseConfigured } from "@/lib/env";
import { getDashboardProfile } from "@/lib/profile-data";
import { debugLog, startServerTimer } from "@/lib/perf";
import { headers } from "next/headers";
import { PATHNAME_HEADER } from "@/middleware";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Next.js does not pass the pathname to a layout, so it is read from the
 * headers the framework sets. Anything that is not a /dashboard path is
 * ignored, so this can never become an open redirect.
 */
async function getRequestedDashboardPath(): Promise<string> {
  try {
    const headerStore = await headers();
    const candidate = headerStore.get(PATHNAME_HEADER) || "";

    const path = candidate.split("?")[0];
    if (path.startsWith("/dashboard") && !path.includes("//")) return path;
  } catch {
    // Headers are unavailable in some rendering contexts.
  }

  return "/dashboard";
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const stopLayoutTimer = startServerTimer("dashboard_layout_time");

  // Preserve the route the visitor actually asked for, so logging in returns
  // them to it instead of dropping everyone on /dashboard.
  const requestedPath = await getRequestedDashboardPath();
  let profile = undefined;
  if (isSupabaseConfigured()) {
    const { user, profile: dashboardProfile } = await getDashboardProfile();

    if (!user) {
      console.warn("[AUTH] dashboard_layout_redirect_login_reason", {
        reason: "no_user_session",
        path: requestedPath,
      });
      console.warn("[AUTH] redirect_to_login_reason", { reason: "dashboard_layout_user_missing", path: requestedPath });
      console.warn("[AUTH] dashboard_route_redirect_login", { path: requestedPath });
      stopLayoutTimer({ result: "redirect_login" });
      redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
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
