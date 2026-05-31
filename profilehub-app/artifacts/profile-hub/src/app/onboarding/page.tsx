import ProfileEditor from "@/views/dashboard/ProfileEditor";
import { isSupabaseConfigured } from "@/lib/env";
import { getOrCreateProfile, getMyProfileContent } from "@/lib/profile-data";
import { getCurrentUser } from "@/modules/auth";
import { redirect } from "next/navigation";
import { mockUser } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  let content: any = undefined;
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    await getOrCreateProfile(user, { source: "onboarding" });
    content = await getMyProfileContent();
  }

  // Fallback if not configured or failed to load
  if (!content) {
    content = {
      profile: mockUser,
      links: [],
      projects: [],
      services: [],
      media: [],
    };
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <ProfileEditor content={content} />
    </main>
  );
}
