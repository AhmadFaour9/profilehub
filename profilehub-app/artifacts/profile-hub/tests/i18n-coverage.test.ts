import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { en, ar } from "../src/lib/i18n/messages";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx$/.test(entry) ? [full] : [];
  });
}

const posix = (file: string) => file.split("\\").join("/");

/**
 * Brand names, proper nouns, and the demo profile. These are intentionally
 * left untranslated.
 */
const ALLOWED = [
  "ProfileHub",
  // The landing mock shows the real demo profile. Its name and headline are
  // that person's own words and render in English on /ahmadfaour whatever the
  // page language is, so the mock matches rather than inventing a translation.
  "Ahmad Faour",
  // The card sets the surname on its own line in the serif face, so the name
  // has to be two text nodes rather than one.
  "Ahmad",
  "Faour",
  "Senior AI Engineer",
  "English",
  "Google",
  "GitHub",
  "Dashboard navigation",
];

const VISIBLE_TEXT = />\s*([A-Z][A-Za-z0-9 ,.'!?&/()-]{3,80})\s*</g;
const VISIBLE_PROP =
  /\b(placeholder|title|label|description|aria-label|helper|emptyText)=["']([A-Z][^"']{3,80})["']/g;

const LOCALE_HOOK = /\buseLocale\s*\(|\buseTranslation\s*\(/;
const CLIENT_DIRECTIVE = /^\s*["']use client["']/;

describe("translation catalogue", () => {
  it("has an Arabic entry for every English key", () => {
    expect(Object.keys(en).filter((key) => !(key in ar))).toEqual([]);
  });

  it("has no Arabic key that English does not define", () => {
    expect(Object.keys(ar).filter((key) => !(key in en))).toEqual([]);
  });

  it("has no empty translations", () => {
    const blank = Object.entries(ar)
      .filter(([, value]) => !String(value).trim())
      .map(([key]) => key);
    expect(blank).toEqual([]);
  });

  it("is actually translated, not copied from English", () => {
    const identical = Object.keys(en).filter(
      (key) => ar[key as keyof typeof ar] === en[key as keyof typeof en]
    );
    // A few proper nouns may legitimately match; more than that means
    // untranslated placeholders were committed.
    expect(identical.length).toBeLessThan(10);
  });
});

describe("component translation coverage", () => {
  it("leaves no user-visible English literals in components", () => {
    const offenders: string[] = [];

    for (const file of walk("src")) {
      const normalized = posix(file);
      // Generic shadcn primitives carry no product copy, and /test-auth is a
      // developer diagnostic page whose raw output is meant to stay literal.
      if (normalized.includes("/components/ui/")) continue;
      if (normalized.includes("/app/test-auth/")) continue;

      const source = readFileSync(file, "utf8");

      for (const match of source.matchAll(VISIBLE_TEXT)) {
        const text = match[1].trim();
        if (!ALLOWED.some((allowed) => text.includes(allowed))) {
          offenders.push(`${normalized}: ${text}`);
        }
      }
      for (const match of source.matchAll(VISIBLE_PROP)) {
        const text = match[2].trim();
        if (!ALLOWED.some((allowed) => text.includes(allowed))) {
          offenders.push(`${normalized}: ${match[1]}="${text}"`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("client hooks are declared", () => {
  /**
   * Calling useLocale() or useTranslation() from a Server Component throws at
   * render time, and neither tsc nor next build catches it - views/not-found
   * passed both and only failed when the page was actually requested.
   *
   * Depending on every caller being a client component is not enough either:
   * a component that uses a client hook has to declare it itself.
   */
  it("finds components that call a locale hook", () => {
    // Guards the guard. An earlier version of the check below silently matched
    // nothing, so it could never fail; this keeps that from recurring.
    const users = walk("src").filter((file) =>
      LOCALE_HOOK.test(readFileSync(file, "utf8"))
    );
    expect(users.length).toBeGreaterThan(5);
  });

  it("every component using a locale hook declares use client", () => {
    const offenders = walk("src")
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return LOCALE_HOOK.test(source) && !CLIENT_DIRECTIVE.test(source);
      })
      .map(posix);

    expect(offenders).toEqual([]);
  });
});
