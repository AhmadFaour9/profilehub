import type { Link, Profile, PublicProfile, Service } from "@/modules/shared";

const PROFILE_TITLE_MAX_LENGTH = 55;
const PROFILE_DESCRIPTION_MAX_LENGTH = 155;

export function getProfileSeoTitle(profile: Profile): string {
  const title = profile.seoTitle || `${profile.displayName}${profile.title ? ` - ${profile.title}` : ""}`;
  return truncateForMetadata(title, PROFILE_TITLE_MAX_LENGTH);
}

export function getProfileSeoDescription(profile: Profile): string {
  const fallback = profile.title
    ? `Explore ${profile.displayName}'s profile, projects, services, and smart links.`
    : `Explore ${profile.displayName}'s public ProfileHub profile.`;

  return truncateForMetadata(profile.seoDescription || profile.bio || fallback, PROFILE_DESCRIPTION_MAX_LENGTH);
}

export function getProfileOgImageUrl(profileUrl: string): string {
  return `${profileUrl.replace(/\/+$/, "")}/opengraph-image`;
}

export function getPrimaryProfileCta(profile: PublicProfile): Link | { title: string; url: string; description?: string } | null {
  const activeLinks = profile.links.filter((link) => link.isActive);
  const featured = activeLinks.find((link) => link.isFeatured);
  if (featured) return featured;

  const contactLike = activeLinks.find((link) => {
    const text = `${link.title} ${link.description || ""} ${link.category || ""}`.toLowerCase();
    return ["contact", "book", "meeting", "call", "consultation", "calendly"].some((term) => text.includes(term));
  });
  if (contactLike) return contactLike;

  const email = profile.socialLinks?.find((link) => link.isActive !== false && link.platform === "email" && link.url);
  if (email) return { title: "Contact", url: email.url, description: "Send an email" };

  const whatsapp = profile.socialLinks?.find((link) => link.isActive !== false && link.platform === "whatsapp" && link.url);
  if (whatsapp) return { title: "WhatsApp", url: whatsapp.url, description: "Start a conversation" };

  const serviceCta = profile.services.find((service: Service) => service.isActive && service.ctaUrl);
  if (serviceCta?.ctaUrl) {
    return {
      title: serviceCta.ctaLabel || `Book ${serviceCta.title}`,
      url: serviceCta.ctaUrl,
      description: serviceCta.description || undefined,
    };
  }

  return null;
}

export function buildProfileJsonLd(profile: PublicProfile, profileUrl: string) {
  const sameAs = uniqueHttpUrls([
    profile.website,
    ...(profile.socialLinks || []).filter((link) => link.isActive !== false).map((link) => link.url),
  ]);

  const personId = `${profileUrl}#person`;
  const profilePageId = `${profileUrl}#profilepage`;

  const projects = profile.projects
    .filter((project) => project.isActive !== false)
    .map((project) => ({
      "@type": "CreativeWork",
      name: project.title,
      description: project.description || undefined,
      url: project.projectUrl || project.repoUrl || undefined,
      image: project.imageUrl || undefined,
      keywords: project.tags?.length ? project.tags.join(", ") : undefined,
    }));

  const offers = profile.services
    .filter((service) => service.isActive)
    .map((service) => ({
      "@type": "Offer",
      name: service.title,
      description: service.description || undefined,
      price: service.priceLabel || service.price || undefined,
      url: service.ctaUrl || profileUrl,
    }));

  const skills = profile.skills
    .filter((skill) => skill.isActive)
    .map((skill) => skill.name)
    .filter(Boolean);

  const description = profile.bio || getProfileSeoDescription(profile);

  return stripUndefined({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": profilePageId,
        url: profileUrl,
        name: getProfileSeoTitle(profile),
        description,
        dateModified: profile.updatedAt || undefined,
        mainEntity: { "@id": personId },
        hasPart: projects.length ? projects : undefined,
      },
      {
        "@type": "Person",
        "@id": personId,
        name: profile.displayName,
        alternateName: profile.username ? `@${profile.username}` : undefined,
        jobTitle: profile.title || profile.profession || undefined,
        description,
        image: toHttpUrl(profile.avatarUrl),
        url: profileUrl,
        address: profile.location
          ? {
              "@type": "PostalAddress",
              addressLocality: profile.location,
            }
          : undefined,
        sameAs: sameAs.length ? sameAs : undefined,
        knowsAbout: skills.length ? skills : undefined,
        makesOffer: offers.length ? offers : undefined,
        mainEntityOfPage: { "@id": profilePageId },
      },
    ],
  });
}

function truncateForMetadata(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const truncated = normalized.slice(0, maxLength - 1);
  const lastWord = truncated.lastIndexOf(" ");
  const readable = lastWord >= Math.floor(maxLength * 0.6) ? truncated.slice(0, lastWord) : truncated;
  return `${readable.trimEnd()}…`;
}

function toHttpUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function uniqueHttpUrls(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map(toHttpUrl).filter((value): value is string => Boolean(value))));
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)])
    ) as T;
  }

  return value;
}
