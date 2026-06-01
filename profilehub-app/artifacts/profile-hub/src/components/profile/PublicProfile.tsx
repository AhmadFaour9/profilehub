import { getPublicProfileCached } from "@/lib/profile-data";
import { notFound } from "next/navigation";
import type { PublicProfile as PublicProfileData } from "@/modules/shared";
import { ProfileHeader } from "./ProfileHeader";
import { SmartLinkCard } from "./SmartLinkCard";
import { ProjectCard } from "./ProjectCard";
import { ServiceCard } from "./ServiceCard";
import { GalleryGrid } from "./GalleryGrid";
import { PageViewBeacon } from "./PageViewBeacon";

export async function PublicProfile({
  username,
  profile: initialProfile,
  profileUrl,
}: {
  username: string;
  profile?: PublicProfileData | null;
  profileUrl?: string;
}) {
  const profile = initialProfile ?? (await getPublicProfileCached(username));

  if (!profile) {
    notFound();
  }

  const hasBg = Boolean(profile.theme?.backgroundColor);

  return (
    <div
      className={`min-h-screen pb-20 ${hasBg ? '' : 'bg-background text-foreground'}`}
      style={hasBg ? { backgroundColor: profile.theme?.backgroundColor } : undefined}
    >
      <PageViewBeacon profileId={profile.id} />
      <div className="max-w-2xl mx-auto">
        <ProfileHeader profile={profile} profileUrl={profileUrl} />
        
        <div className="px-4 mt-8 space-y-12">
          {profile.links.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium sr-only">Links</h2>
              <div className="space-y-3">
                {profile.links.map((link) => (
                  <SmartLinkCard key={link.id} link={link} theme={profile.theme} />
                ))}
              </div>
            </section>
          )}

          {profile.projects.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-serif">Selected Works</h2>
              <div className="grid gap-6">
                {profile.projects.map((project) => (
                  <ProjectCard key={project.id} project={project} theme={profile.theme} />
                ))}
              </div>
            </section>
          )}

          {profile.services.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-serif">Services</h2>
              <div className="grid gap-4">
                {profile.services.map((service) => (
                  <ServiceCard key={service.id} service={service} theme={profile.theme} />
                ))}
              </div>
            </section>
          )}

          {profile.gallery.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-serif">Gallery</h2>
              <GalleryGrid items={profile.gallery} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
