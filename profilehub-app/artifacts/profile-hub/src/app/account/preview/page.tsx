import { redirect } from "next/navigation";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { getMyProfileContent } from "@/lib/profile-data";
import { getCanonicalProfileUrl } from "@/lib/request-url";
import type { PublicProfile as PublicProfileData } from "@/modules/shared";

export const dynamic = "force-dynamic";

export default async function AccountPreviewPage() {
  const content = await getMyProfileContent();

  if (!content) {
    redirect("/login?next=/account/preview");
  }

  const profile: PublicProfileData = {
    ...content.profile,
    links: content.links,
    projects: content.projects,
    services: content.services,
    gallery: content.media,
  };
  return <PublicProfile username={profile.username} profile={profile} profileUrl={getCanonicalProfileUrl(profile.username)} />;
}
