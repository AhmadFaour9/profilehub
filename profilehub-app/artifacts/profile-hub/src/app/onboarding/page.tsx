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
    try {
      const user = await getCurrentUser();
      if (!user) redirect("/login");
      content = await getMyProfileContent();
    } catch (error: any) {
      console.error("[ONBOARDING] load_failed", { error: error?.message || error });
    }
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
