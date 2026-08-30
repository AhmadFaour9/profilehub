export const dynamic = "force-dynamic";
import ProfileEditor from "@/views/dashboard/ProfileEditor";
import { VisibilityManager } from "@/components/dashboard/VisibilityManager";
import { requireMyProfileContent } from "@/lib/profile-data";
import { DEFAULT_SECTION_VISIBILITY } from "@/lib/profile-visibility";

export default async function DashboardProfilePage() {
  const content = await requireMyProfileContent("/dashboard/profile");

  // Drives the "no content yet" hint next to each toggle.
  const counts = {
    about: content.profile.bio?.trim() ? 1 : 0,
    socialLinks: content.profile.socialLinks?.length ?? 0,
    smartLinks: content.links.length,
    projects: content.projects.length,
    services: content.services.length,
    gallery: content.media.length,
    skills: content.skills.length,
    email: content.profile.email?.trim() ? 1 : 0,
    location: content.profile.location?.trim() ? 1 : 0,
    website: content.profile.website?.trim() ? 1 : 0,
  };

  return (
    <div className="space-y-10">
      <ProfileEditor content={content} />
      <VisibilityManager
        initial={content.profile.sectionVisibility ?? DEFAULT_SECTION_VISIBILITY}
        counts={counts}
      />
    </div>
  );
}
