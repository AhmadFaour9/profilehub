import type { MessageKey } from "@/lib/i18n";

/**
 * Which sections of the public profile are shown.
 *
 * Every key defaults to true: a profile that predates this feature, or a row
 * with a partial object, keeps rendering everything it rendered before.
 */
export type SectionVisibility = {
  about: boolean;
  socialLinks: boolean;
  smartLinks: boolean;
  projects: boolean;
  services: boolean;
  gallery: boolean;
  skills: boolean;
  email: boolean;
  location: boolean;
  website: boolean;
};

export const SECTION_KEYS = [
  "about",
  "socialLinks",
  "smartLinks",
  "projects",
  "services",
  "gallery",
  "skills",
  "email",
  "location",
  "website",
] as const satisfies readonly (keyof SectionVisibility)[];

export type SectionKey = (typeof SECTION_KEYS)[number];

export const DEFAULT_SECTION_VISIBILITY: SectionVisibility = {
  about: true,
  socialLinks: true,
  smartLinks: true,
  projects: true,
  services: true,
  gallery: true,
  skills: true,
  email: true,
  location: true,
  website: true,
};

/** Groups drive the dashboard layout: content blocks vs. contact details. */
export const SECTION_GROUPS: {
  id: "content" | "contact";
  labelKey: MessageKey;
  keys: SectionKey[];
}[] = [
  {
    id: "content",
    labelKey: "visibility.title",
    keys: ["about", "socialLinks", "smartLinks", "skills", "projects", "services", "gallery"],
  },
  {
    id: "contact",
    labelKey: "visibility.showContact",
    keys: ["email", "location", "website"],
  },
];

export const SECTION_LABEL_KEYS: Record<SectionKey, MessageKey> = {
  about: "visibility.showAbout",
  socialLinks: "visibility.showSocialLinks",
  smartLinks: "visibility.showSmartLinks",
  projects: "visibility.showProjects",
  services: "visibility.showServices",
  gallery: "visibility.showGallery",
  skills: "visibility.showSkills",
  email: "visibility.showEmail",
  location: "visibility.showLocation",
  website: "visibility.showWebsite",
};

/**
 * Normalizes an unknown jsonb value into a complete SectionVisibility.
 * Anything not explicitly false becomes true.
 */
export function parseSectionVisibility(value: unknown): SectionVisibility {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_SECTION_VISIBILITY };
  }

  const source = value as Record<string, unknown>;
  const result = { ...DEFAULT_SECTION_VISIBILITY };

  for (const key of SECTION_KEYS) {
    if (source[key] === false) result[key] = false;
  }

  return result;
}

/** Serializes back to jsonb, keeping only known keys. */
export function serializeSectionVisibility(value: SectionVisibility): Record<SectionKey, boolean> {
  return Object.fromEntries(SECTION_KEYS.map((key) => [key, value[key] !== false])) as Record<
    SectionKey,
    boolean
  >;
}
