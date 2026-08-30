"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  getDirection,
  normalizeLocale,
  type Locale,
} from "./config";
import { createTranslator, type Translate } from "./index";

type LocaleContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Translate;
  setLocale: (next: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function persistLocale(locale: Locale) {
  if (typeof document === "undefined") return;

  document.cookie = [
    `${LOCALE_COOKIE}=${locale}`,
    "path=/",
    `max-age=${LOCALE_COOKIE_MAX_AGE}`,
    "samesite=lax",
  ].join("; ");

  document.documentElement.lang = locale;
  document.documentElement.dir = getDirection(locale);
}

/**
 * Seeded from the server so the first paint already matches the cookie and
 * there is no flash of the wrong language or direction.
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => normalizeLocale(initialLocale));
  const router = useRouter();
  const [, startTransition] = useTransition();

  const setLocale = useCallback(
    (next: Locale) => {
      const normalized = normalizeLocale(next);
      persistLocale(normalized);
      setLocaleState(normalized);

      // Server Components read the locale from the cookie, so they need a
      // refresh to re-render. Without this, only client text would switch.
      startTransition(() => router.refresh());
    },
    [router]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: getDirection(locale),
      t: createTranslator(locale),
      setLocale,
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);

  // Components rendered outside the provider still need to render something
  // readable rather than crash, so fall back to the default locale.
  if (!context) {
    return {
      locale: DEFAULT_LOCALE,
      dir: getDirection(DEFAULT_LOCALE),
      t: createTranslator(DEFAULT_LOCALE),
      setLocale: () => {},
    };
  }

  return context;
}
