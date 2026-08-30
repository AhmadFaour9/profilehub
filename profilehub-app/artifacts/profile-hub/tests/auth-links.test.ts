import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Next.js prefetches <Link> targets on hover and in the viewport, and
 * prefetching a Route Handler executes it.
 *
 * /auth/google mints a PKCE pair and stores the verifier in a cookie, so an
 * early execution leaves the stored verifier out of step with the challenge
 * sent to Google. Production failed with "code challenge does not match
 * previously saved code verifier" for exactly this reason. /auth/logout would
 * simply sign the user out on hover.
 *
 * Either use a plain <a>, or pass prefetch={false}.
 */
const SIDE_EFFECT_ROUTES = ["/auth/google", "/auth/logout"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(tsx|jsx)$/.test(entry) ? [full] : [];
  });
}

describe("links to side-effecting auth routes", () => {
  const files = walk("src");

  for (const route of SIDE_EFFECT_ROUTES) {
    it(`never renders a prefetchable <Link> to ${route}`, () => {
      const offenders: string[] = [];

      for (const file of files) {
        const source = readFileSync(file, "utf8");
        if (!source.includes(route)) continue;

        // Look at each <Link ...> element that mentions the route.
        const links = source.match(/<Link[\s\S]{0,400}?>/g) ?? [];
        for (const link of links) {
          if (!link.includes(route)) continue;
          if (!/prefetch=\{false\}/.test(link)) {
            offenders.push(`${file}: ${link.replace(/\s+/g, " ").slice(0, 90)}`);
          }
        }
      }

      expect(offenders).toEqual([]);
    });
  }

  it("keeps the Google button as a plain anchor", () => {
    for (const file of ["src/views/Login.tsx", "src/views/Register.tsx"]) {
      const source = readFileSync(file, "utf8");
      expect(source).toMatch(/<a href=\{?[`"]\/auth\/google/);
    }
  });
});
