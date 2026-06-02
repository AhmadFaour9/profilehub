import { AppShell } from "@/components/AppShell";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/modules/auth";
import { getOrCreateProfile } from "@/lib/profile-data";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let profile = undefined;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
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
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
