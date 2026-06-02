import { AppShell } from "@/components/AppShell";
import { isSupabaseConfigured } from "@/lib/env";
import { getAuthenticatedUser } from "@/modules/auth";
import { getOrCreateProfile } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let profile = undefined;
  if (isSupabaseConfigured()) {
    const { supabase, user } = await getAuthenticatedUser("dashboard_layout");

    if (!user) {
      console.warn("[AUTH] dashboard_route_redirect_login", { path: "/dashboard" });
      redirect("/login?next=/dashboard");
    }

    console.info("[AUTH] dashboard_layout_user_id", { user_id: user.id });
    console.info("[AUTH] dashboard_route_allowed", { path: "/dashboard", user_id: user.id });

    try {
      profile = (await getOrCreateProfile(user, {
        source: "dashboard",
        authClient: supabase,
        allowFallbackProfile: true,
      })) || undefined;
    } catch (error: any) {
      console.error("[DASHBOARD_LAYOUT] load_failed", { error: error?.message || error });
    }
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
