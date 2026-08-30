import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { normalizeProfileKey, profileCacheKey, profileCacheTag } from "../src/lib/profile-cache";

/**
 * Profile lookup is case-insensitive, so every spelling of a username must map
 * to a single cache entry and a single tag. When they diverged, a save
 * invalidated only the canonical spelling and every other one kept serving
 * pre-save content for the whole revalidate window.
 */
const SPELLINGS = ["ahmadfaour", "AhmadFaour", "AHMADFAOUR", "  AhmadFaour  "];

describe("profile cache identity", () => {
  it("maps every spelling of a username to one tag", () => {
    const tags = new Set(SPELLINGS.map(profileCacheTag));
    expect(tags.size).toBe(1);
    expect([...tags][0]).toBe("profile:ahmadfaour");
  });

  it("maps every spelling to one cache key", () => {
    const keys = new Set(SPELLINGS.map((s) => profileCacheKey(s).join("|")));
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe("public-profile|ahmadfaour");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeProfileKey("  Ahmad  ")).toBe("ahmad");
  });

  it("keeps distinct usernames distinct", () => {
    expect(profileCacheTag("ahmad")).not.toBe(profileCacheTag("ahmad2"));
  });
});

describe("reader and invalidator agree", () => {
  it("both go through the shared helper rather than interpolating a raw name", () => {
    const dataModule = readFileSync("src/lib/profile-data.ts", "utf8");
    const actions = readFileSync("src/app/dashboard/actions.ts", "utf8");

    // The original bug was a raw template literal on each side.
    expect(dataModule).not.toMatch(/tags:\s*\[`profile:\$\{username\}`\]/);
    expect(actions).not.toMatch(/revalidateTag\(`profile:\$\{username\}`/);

    expect(dataModule).toContain("profileCacheTag(username)");
    expect(actions).toContain("profileCacheTag(username)");
  });

  it("the public profile route has no route-level time cache", () => {
    const route = readFileSync("src/app/[username]/page.tsx", "utf8");
    // A per-path route cache cannot be invalidated for non-canonical casing.
    expect(route).not.toMatch(/^export const revalidate = \d+/m);
  });
});
