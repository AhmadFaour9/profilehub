import ProfileEditor from "@/views/dashboard/ProfileEditor";
import { isSupabaseConfigured } from "@/lib/env";
import { getOrCreateProfile } from "@/lib/profile-data";
import { getCurrentUser } from "@/modules/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  let profile = undefined;
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    profile = (await getOrCreateProfile(user, { source: "onboarding" })) || undefined;
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <ProfileEditor profile={profile} />
    </main>
  );
}
