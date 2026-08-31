import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import { default as robots } from "../src/app/robots";

describe("site SEO and performance", () => {
  it("includes the critical global SEO fields in layout", () => {
    const layoutPath = join(process.cwd(), "src/app/layout.tsx");
    const layoutContent = readFileSync(layoutPath, "utf-8");

    // Verify key metadata fields
    expect(layoutContent).toContain("ProfileHub");
    expect(layoutContent).toContain("professional profile");
    expect(layoutContent).toContain("personal branding");
    expect(layoutContent).toContain('"website"'); // openGraph type
    expect(layoutContent).toContain("summary_large_image"); // twitter card
    expect(layoutContent).toContain("canonical");
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
    expect(layoutContent).toContain("index: true");
    expect(layoutContent).toContain("follow: true");

    // Verify keywords array
    expect(layoutContent).toContain("keywords");
    expect(layoutContent).toContain("professional profile");
  });

  it("configures robots with proper crawl rules", () => {
    const rules = robots();

    expect(rules.rules.allow).toBe("/");
    // Verify disallowed paths
    expect(rules.rules.disallow).toContain("/api/");
    expect(rules.rules.disallow).toContain("/auth/");
  });
});
