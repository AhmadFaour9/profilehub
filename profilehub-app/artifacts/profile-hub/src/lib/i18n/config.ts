export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie is readable by the client switcher, so it is not httpOnly. */
export const LOCALE_COOKIE = "profilehub_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * Picks the best locale from an Accept-Language header, used only for visitors
 * who have never chosen one. Falls back to the default rather than guessing.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const quality = q ? Number.parseFloat(q.split("=")[1]) : 1;
      return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((entry) => entry.tag)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }

  return null;
}
