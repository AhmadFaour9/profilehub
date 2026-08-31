import { Metadata } from "next";
import { LOCALES, type Locale } from "./config";
import { getAppUrl } from "@/lib/env";

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
 * Generate hreflang alternates for multilingual support
 * Used in metadata.alternates.languages
 */
export function generateHrefLangAlternates(
  path: string = "/"
): Record<string, string> {
  const appUrl = getAppUrl();
  const alternates: Record<string, string> = {};

  LOCALES.forEach((locale) => {
    const url = new URL(path, appUrl);
    // For simplicity, we use subdirectory approach (e.g., /en/, /ar/)
    // In production, you might use subdomains (en.profilehub.app, ar.profilehub.app)
    const localizedPath = locale === "en" ? path : `/${locale}${path === "/" ? "" : path}`;
    alternates[locale] = new URL(localizedPath, appUrl).toString();
  });

  // Add x-default for unspecified language preference
  alternates["x-default"] = new URL("/", appUrl).toString();

  return alternates;
}

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
    "@language": locale,
    name: "ProfileHub",
    url: appUrl,
    logo: `${appUrl}/icon.png`,
    description: metadata.description,
    sameAs: ["https://github.com/AhmadFaour9/profilehub"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@profilehub.app",
    },
    inLanguage: locale === "ar" ? "ar-AE" : "en-US",
  };
}

/**
 * Generate localized WebSite schema with search
 */
export function generateLocalizedWebsiteSchema(
  locale: Locale,
  appUrl: string
): Record<string, unknown> {
  const metadata = localizedMetadata[locale];
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@language": locale,
    name: "ProfileHub",
    url: appUrl,
    description: metadata.description,
    inLanguage: locale === "ar" ? "ar-AE" : "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${appUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

