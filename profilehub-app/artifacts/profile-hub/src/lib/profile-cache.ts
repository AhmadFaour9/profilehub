/**
 * Cache identity for a public profile.
 *
 * Profile lookup is case-insensitive (`ilike`), so /Ahmad, /ahmad and /AHMAD
 * all resolve to the same row. Keying the cache on the raw path segment gave
 * each spelling its own entry and its own tag, while a save could only
 * invalidate the tag for the canonical spelling held in the database. Every
 * other spelling then served pre-save content until the time window expired.
 *
 * Both the reader and the invalidator go through these helpers, so one profile
 * always means one cache entry and one tag.
 *
 * Kept dependency-free on purpose: it is imported by both a server-only data
 * module and a server action, and it stays directly testable.
 */
export function normalizeProfileKey(username: string): string {
  return username.trim().toLowerCase();
}

export function profileCacheTag(username: string): string {
  return `profile:${normalizeProfileKey(username)}`;
}

export function profileCacheKey(username: string): string[] {
  return ["public-profile", normalizeProfileKey(username)];
}
