import { AppShell } from "@/components/AppShell";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/modules/auth";
import { getOrCreateProfile } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let profile = undefined;
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    profile = (await getOrCreateProfile(user)) || undefined;
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
