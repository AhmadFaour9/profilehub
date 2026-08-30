import { getPublicProfileCached } from "@/lib/profile-data";
import { notFound } from "next/navigation";
import type { PublicProfile as PublicProfileData } from "@/modules/shared";
import { ProfileHeader } from "./ProfileHeader";
import { SmartLinkCard } from "./SmartLinkCard";
import { ProjectCard } from "./ProjectCard";
import { ServiceCard } from "./ServiceCard";
import { GalleryGrid } from "./GalleryGrid";
import { SkillsSection } from "./SkillsSection";
import { ProfileFooter } from "./ProfileFooter";
import { PageViewBeacon } from "./PageViewBeacon";
import { buildProfileJsonLd, getPrimaryProfileCta } from "@/lib/profile-seo";
import { getTranslations } from "@/lib/i18n/server";
import { parseSectionVisibility } from "@/lib/profile-visibility";
import type { Translate } from "@/lib/i18n";

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

  const { t } = await getTranslations();

  // A hidden section becomes an empty collection, so JSON-LD, the primary CTA,
  // and the empty state all follow from the same source of truth.
  const visibility = parseSectionVisibility(profile.sectionVisibility);
  const shownProfile = {
    ...profile,
    bio: visibility.about ? profile.bio : null,
    email: visibility.email ? profile.email : null,
    location: visibility.location ? profile.location : null,
    website: visibility.website ? profile.website : null,
    socialLinks: visibility.socialLinks ? profile.socialLinks : [],
  };

  const hasBg = Boolean(profile.theme?.backgroundColor);
  const visibleLinks = (visibility.smartLinks ? profile.links : [])
    .filter((link) => link.isActive)
    .sort((a, b) => {
      if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) return a.isFeatured ? -1 : 1;
      return (a.sortOrder ?? a.order ?? a.position ?? 0) - (b.sortOrder ?? b.order ?? b.position ?? 0);
    });
  const visibleServices = (visibility.services ? profile.services : [])
    .filter((service) => service.isActive)
    .sort((a, b) => (a.sortOrder ?? a.order ?? a.position ?? 0) - (b.sortOrder ?? b.order ?? b.position ?? 0));
  const visibleProjects = (visibility.projects ? profile.projects : [])
    .filter((project) => project.isActive !== false)
    .sort((a, b) => (a.order ?? a.position ?? 0) - (b.order ?? b.position ?? 0));
  const visibleSkills = visibility.skills ? (profile.skills ?? []) : [];
  const visibleGallery = (visibility.gallery ? profile.gallery : [])
    .filter((item) => item.imageUrl || item.url)
    .sort((a, b) => (a.order ?? a.position ?? 0) - (b.order ?? b.position ?? 0));
  const canonicalUrl = profileUrl || `/${profile.username}`;
  const jsonLd = buildProfileJsonLd(
    {
      ...shownProfile,
      links: visibleLinks,
      projects: visibleProjects,
      services: visibleServices,
      gallery: visibleGallery,
    },
    canonicalUrl
  );
  const primaryCta = getPrimaryProfileCta({ ...shownProfile, links: visibleLinks, projects: visibleProjects, services: visibleServices, gallery: visibleGallery });
  const primaryCtaId = primaryCta && "id" in primaryCta ? primaryCta.id : null;
  const linkCards = primaryCtaId ? visibleLinks.filter((link) => link.id !== primaryCtaId) : visibleLinks;
  const featuredLinks = linkCards.filter((link) => link.isFeatured);
  const regularLinks = linkCards.filter((link) => !link.isFeatured);
  const hasPublicContent = Boolean(primaryCta || linkCards.length || visibleSkills.length || visibleProjects.length || visibleServices.length || visibleGallery.length);

  return (
    <div
      className={`min-h-screen pb-20 ${hasBg ? '' : 'bg-background text-foreground'}`}
      style={hasBg ? { backgroundColor: profile.theme?.backgroundColor } : undefined}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PageViewBeacon profileId={profile.id} />
      <div className="max-w-2xl mx-auto">
        <ProfileHeader profile={shownProfile} profileUrl={profileUrl} />
        
        <div className="px-4 mt-8 space-y-12">
          {primaryCta && <PrimaryCta cta={primaryCta} t={t} />}

          {featuredLinks.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-serif">{t("public.featured")}</h2>
              <div className="space-y-3">
                {featuredLinks.map((link) => (
                  <SmartLinkCard key={link.id} link={link} theme={profile.theme} />
                ))}
              </div>
            </section>
          )}

          {regularLinks.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium sr-only">{t("public.links")}</h2>
              <div className="space-y-3">
                {regularLinks.map((link) => (
                  <SmartLinkCard key={link.id} link={link} theme={profile.theme} />
                ))}
              </div>
            </section>
          )}

          {visibleSkills.length > 0 && <SkillsSection skills={visibleSkills} projects={visibleProjects} t={t} />}

          {visibleProjects.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-serif">{t("public.projects")}</h2>
              <div className="grid gap-6">
                {visibleProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} theme={profile.theme} />
                ))}
              </div>
            </section>
          )}

          {visibleServices.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-serif">{t("public.services")}</h2>
              <div className="grid gap-4">
                {visibleServices.map((service) => (
                  <ServiceCard key={service.id} service={service} theme={profile.theme} />
                ))}
              </div>
            </section>
          )}

          {visibleGallery.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-serif">{t("public.gallery")}</h2>
              <GalleryGrid items={visibleGallery} />
            </section>
          )}

          {!hasPublicContent && (
            <section className="rounded-xl border bg-card p-6 text-center">
              <h2 className="text-lg font-medium text-foreground">{t("public.emptyProfile")}</h2>
            </section>
          )}
        </div>
      </div>

      <ProfileFooter profile={shownProfile} profileUrl={profileUrl} t={t} />

      {primaryCta && <StickyMobileCta cta={primaryCta} />}
    </div>
  );
}

function ctaHref(cta: { id?: string; url: string }) {
  return cta.id ? `/go/${cta.id}` : cta.url;
}

function PrimaryCta({ cta, t }: { cta: { id?: string; title: string; url: string; description?: string | null }; t: Translate }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t("public.startHere")}</p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-serif text-foreground">{cta.title}</h2>
          {cta.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{cta.description}</p>}
        </div>
        <a
          href={ctaHref(cta)}
          target={cta.url.startsWith("mailto:") ? undefined : "_blank"}
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {t("action.continue")}
        </a>
      </div>
    </section>
  );
}

function StickyMobileCta({ cta }: { cta: { id?: string; title: string; url: string } }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur md:hidden">
      <a
        href={ctaHref(cta)}
        target={cta.url.startsWith("mailto:") ? undefined : "_blank"}
        rel="noopener noreferrer"
        className="flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
      >
        {cta.title}
      </a>
    </div>
  );
}
