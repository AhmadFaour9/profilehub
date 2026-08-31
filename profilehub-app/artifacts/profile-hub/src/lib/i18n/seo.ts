import { type Locale } from "./config";

/**
 * Multilingual metadata content for each supported locale
 */
export const localizedMetadata: Record<
  Locale,
  {
    title: string;
    description: string;
    keywords: string[];
    ogTitle: string;
    ogDescription: string;
  }
> = {
  en: {
    title: "ProfileHub | Professional Profile & Personal Brand Hub",
    description:
      "Build a modern professional profile with links, projects, services, analytics, and an AI-enhanced personal brand hub.",
    keywords: [
      "ProfileHub",
      "professional profile",
      "personal branding",
      "creator portfolio",
      "digital resume",
      "portfolio website",
      "business profile",
      "professional website",
    ],
    ogTitle: "ProfileHub | Professional Profile & Personal Brand Hub",
    ogDescription:
      "Showcase your work, services, links, and contact details through one elegant professional profile.",
  },
  ar: {
    title: "ProfileHub | ملف تعريفي احترافي ومركز العلامة التجارية الشخصية",
    description:
      "بناء ملف تعريفي احترافي حديث مع الروابط والمشاريع والخدمات والتحليلات وومركز العلامة التجارية الشخصية المحسّن بالذكاء الاصطناعي.",
    keywords: [
      "ProfileHub",
      "ملف تعريفي احترافي",
      "العلامة التجارية الشخصية",
      "محفظة المشاريع",
      "السيرة الذاتية الرقمية",
      "موقع محفظة أعمال",
      "ملف تعريفي تجاري",
      "موقع احترافي",
    ],
    ogTitle: "ProfileHub | ملف تعريفي احترافي ومركز العلامة التجارية الشخصية",
    ogDescription:
      "عرض عملك والخدمات والروابط وتفاصيل جهات الاتصال من خلال ملف تعريفي احترافي واحد أنيق.",
  },
};

/**
 * Get metadata for a specific locale
 */
export function getLocalizedMetadata(locale: Locale): (typeof localizedMetadata)[Locale] {
  return localizedMetadata[locale] || localizedMetadata.en;
}

/**
 * Generate locale-specific title template
 */
export function getLocalizedTitleTemplate(locale: Locale): string {
  return locale === "ar" ? "%s | ProfileHub" : "%s | ProfileHub";
}

/**
 * Generate localized Organization JSON-LD schema
 */
export function generateLocalizedOrganizationSchema(
  locale: Locale,
  appUrl: string
): Record<string, unknown> {
  const metadata = localizedMetadata[locale];
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${appUrl}/#organization`,
    "@language": locale,
    name: "ProfileHub",
    url: appUrl,
    logo: `${appUrl}/icon.png`,
    description: metadata.description,
    sameAs: ["https://github.com/AhmadFaour9/profilehub"],
    inLanguage: locale,
  };
}

/** Generate localized WebSite schema for the public landing page. */
export function generateLocalizedWebsiteSchema(
  locale: Locale,
  appUrl: string
): Record<string, unknown> {
  const metadata = localizedMetadata[locale];
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${appUrl}/#website`,
    "@language": locale,
    name: "ProfileHub",
    url: appUrl,
    description: metadata.description,
    inLanguage: locale,
    publisher: { "@id": `${appUrl}/#organization` },
  };
}

