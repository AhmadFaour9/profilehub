import type { Link, Profile, PublicProfile, Service } from "@/modules/shared";

export function getProfileSeoTitle(profile: Profile): string {
  return profile.seoTitle || `${profile.displayName}${profile.title ? ` - ${profile.title}` : ""} | ProfileHub`;
}

export function getProfileSeoDescription(profile: Profile): string {
  const fallback = profile.title
    ? `Explore ${profile.displayName}'s profile, projects, services, and smart links.`
    : `Explore ${profile.displayName}'s public ProfileHub profile.`;

  return (profile.seoDescription || profile.bio || fallback).slice(0, 160);
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
  const sameAs = [
    profile.website,
    ...(profile.socialLinks || []).filter((link) => link.isActive !== false).map((link) => link.url),
  ].filter(Boolean);

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

  const services = profile.services
    .filter((service) => service.isActive)
    .map((service) => ({
      "@type": "Offer",
      name: service.title,
      description: service.description || undefined,
      price: service.priceLabel || service.price || undefined,
      url: service.ctaUrl || profileUrl,
    }));

  return stripUndefined({
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.displayName,
    alternateName: profile.username ? `@${profile.username}` : undefined,
    jobTitle: profile.title || profile.profession || undefined,
    description: profile.bio || undefined,
    image: profile.avatarUrl || undefined,
    url: profileUrl,
    address: profile.location
      ? {
          "@type": "PostalAddress",
          addressLocality: profile.location,
        }
      : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    mainEntityOfPage: {
      "@type": "ProfilePage",
      "@id": profileUrl,
    },
    hasPart: projects.length ? projects : undefined,
    makesOffer: services.length ? services : undefined,
  });
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
