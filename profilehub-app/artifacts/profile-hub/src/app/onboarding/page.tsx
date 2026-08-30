import ProfileEditor from "@/views/dashboard/ProfileEditor";
import { ResumeImportCard } from "@/components/dashboard/ResumeImportCard";
import { isSupabaseConfigured } from "@/lib/env";
import { getMyProfileContent } from "@/lib/profile-data";
import { getTranslations } from "@/lib/i18n/server";
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

  const { t } = await getTranslations();

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

  // Only offer the CV import while there is nothing to overwrite. Once the user
  // has written a headline or bio, the full report at /dashboard/resume is the
  // right place — it asks before replacing anything.
  const profile = content.profile;
  const isBlank =
    !profile.bio?.trim() && !profile.title?.trim() && !profile.location?.trim();

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-serif">{t("onboarding.title")}</h1>
          <p className="text-muted-foreground">{t("onboarding.subtitle")}</p>
        </header>

        {isBlank && <ResumeImportCard />}

        <ProfileEditor content={content} />
      </div>
    </main>
  );
}
