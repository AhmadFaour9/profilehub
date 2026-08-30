"use client";

import { useLocale } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

export type Language = Locale;

/**
 * Backwards-compatible adapter over the locale context. Kept so existing call
 * sites keep working; new code can use useLocale() directly.
 */
export function useTranslation() {
  const { t, locale, setLocale, dir } = useLocale();
  return { t, language: locale, setLanguage: setLocale, dir };
}
