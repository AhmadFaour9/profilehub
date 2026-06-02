import ProfileEditor from "@/views/dashboard/ProfileEditor";
import { isSupabaseConfigured } from "@/lib/env";
import { getMyProfileContent } from "@/lib/profile-data";
import { getAuthenticatedUser } from "@/modules/auth";
import { redirect } from "next/navigation";


export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  let content: any = undefined;
  if (!isSupabaseConfigured()) {
    redirect("/login?next=/onboarding");
  }

  const { user } = await getAuthenticatedUser("onboarding");
  if (!user) {
    redirect("/login?next=/onboarding");
  }

  try {
    content = await getMyProfileContent();
  } catch (error: any) {
    console.error("[ONBOARDING] load_failed", { error: error?.message || error });
  }

  if (!content) {
    return (
      <main className="min-h-screen bg-background p-4 md:p-8">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Could not load your profile setup. Your session is valid, but profile data could not be loaded.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <ProfileEditor content={content} />
    </main>
  );
}
