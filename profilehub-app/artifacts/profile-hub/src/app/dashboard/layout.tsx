import { AppShell } from "@/components/AppShell";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/modules/auth";
import { getOrCreateProfile } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let profile = undefined;
  if (isSupabaseConfigured()) {
    try {
      const user = await getCurrentUser();
      if (!user) redirect("/login");
      profile = (await getOrCreateProfile(user, { source: "dashboard" })) || undefined;
    } catch (error: any) {
      console.error("[DASHBOARD_LAYOUT] load_failed", { error: error?.message || error });
      // If we completely fail to load or create a profile, fallback to undefined
      // so the AppShell handles it gracefully instead of a 500 error page.
    }
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
