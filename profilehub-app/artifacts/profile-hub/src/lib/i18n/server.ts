import "server-only";

import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDirection,
  normalizeLocale,
  type Locale,
} from "./config";
import { createTranslator, type Translate } from "./index";

/**
 * The locale is whatever the visitor last chose, and English until they choose.
 *
 * Accept-Language is deliberately NOT consulted. Honouring it made the site
 * inconsistent: a visitor with an Arabic browser got Arabic on translated pages
 * and English on the ones still carrying literals, with no visible control to
 * reconcile them. English everywhere plus an explicit switcher is predictable.
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE)?.value;
  return stored ? normalizeLocale(stored) : DEFAULT_LOCALE;
}

export async function getTranslations(): Promise<{
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Translate;
}> {
  const locale = await getLocale();
  return { locale, dir: getDirection(locale), t: createTranslator(locale) };
}
