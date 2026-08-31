import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import { default as robots } from "../src/app/robots";
import { isNonIndexablePath } from "../src/lib/seo/indexability";

describe("site SEO and performance", () => {
  it("includes the critical global SEO fields in layout", () => {
    const layoutPath = join(process.cwd(), "src/app/layout.tsx");
    const layoutContent = readFileSync(layoutPath, "utf-8");
    const homepagePath = join(process.cwd(), "src/app/page.tsx");
    const homepageContent = readFileSync(homepagePath, "utf-8");

    // Verify key metadata fields
    expect(layoutContent).toContain("ProfileHub");
    expect(layoutContent).toContain("professional profile");
    expect(layoutContent).toContain("personal branding");
    expect(layoutContent).toContain('"website"'); // openGraph type
    expect(layoutContent).toContain("summary_large_image"); // twitter card
    expect(layoutContent).toContain("canonical");
    expect(layoutContent).toContain("max-image-preview");
    expect(layoutContent).toContain("opengraph.jpg");
    expect(homepageContent).toContain("Create a Professional Profile | ProfileHub");
  });

  it("exposes a crawlable robots route with the sitemap", () => {
    const rules = robots();

    expect(rules).toMatchObject({
      rules: {
        userAgent: "*",
        allow: "/",
      },
      sitemap: expect.arrayContaining([expect.stringContaining("sitemap.xml")]),
    });
  });

  it("includes metadata verifications", () => {
    const layoutPath = join(process.cwd(), "src/app/layout.tsx");
    const layoutContent = readFileSync(layoutPath, "utf-8");

    // Verify robots configuration
    expect(layoutContent).toContain("index: shouldIndex");
    expect(layoutContent).toContain("follow: shouldIndex");
    expect(layoutContent).toContain("googleBot:");

    // Verify keywords array
    expect(layoutContent).toContain("keywords");
    expect(layoutContent).toContain("professional profile");
  });

  it("allows private pages to be crawled so their noindex header is effective", () => {
    const rules = robots();

    expect(rules.rules.allow).toBe("/");
    expect(rules.rules.disallow).toBeUndefined();
  });

  it("marks private, authentication, forwarding, and API routes as non-indexable", () => {
    ["/dashboard", "/dashboard/profile", "/login", "/register", "/forgot-password", "/auth/callback", "/account/preview", "/go/abc", "/api/ai"].forEach(
      (pathname) => expect(isNonIndexablePath(pathname)).toBe(true)
    );

    ["/", "/ahmadfaour", "/sitemap.xml"].forEach((pathname) => expect(isNonIndexablePath(pathname)).toBe(false));
  });
});
