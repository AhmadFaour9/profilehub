import "server-only";

import { cookies, headers } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDirection,
  localeFromAcceptLanguage,
  normalizeLocale,
  type Locale,
} from "./config";
import { createTranslator, type Translate } from "./index";

/**
 * Resolution order: the user's explicit cookie choice, then the browser's
 * Accept-Language, then English. Reading cookies opts the caller into dynamic
 * rendering, which every locale-aware page needs anyway.
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE)?.value;
  if (stored) return normalizeLocale(stored);

  try {
    const headerStore = await headers();
    const preferred = localeFromAcceptLanguage(headerStore.get("accept-language"));
    if (preferred) return preferred;
  } catch {
    // headers() is unavailable in some static contexts; fall through.
  }

  return DEFAULT_LOCALE;
}

export async function getTranslations(): Promise<{
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Translate;
}> {
  const locale = await getLocale();
  return { locale, dir: getDirection(locale), t: createTranslator(locale) };
}
