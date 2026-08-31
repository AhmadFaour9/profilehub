import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("multilingual SEO", () => {
  it("includes hreflang alternates in layout metadata", () => {
    const layoutPath = join(process.cwd(), "src/app/layout.tsx");
    const layoutContent = readFileSync(layoutPath, "utf-8");

    expect(layoutContent).toContain("generateHrefLangAlternates");
    expect(layoutContent).toContain("alternates:");
    expect(layoutContent).toContain("languages:");
  });

  it("imports localized metadata utility", () => {
    const layoutPath = join(process.cwd(), "src/app/layout.tsx");
    const layoutContent = readFileSync(layoutPath, "utf-8");

    expect(layoutContent).toContain("@/lib/i18n/seo");
    expect(layoutContent).toContain("generateHrefLangAlternates");
  });

  it("provides localized metadata for English and Arabic", () => {
    const seoPath = join(process.cwd(), "src/lib/i18n/seo.ts");
    const seoContent = readFileSync(seoPath, "utf-8");

    // Check English metadata
    expect(seoContent).toContain("en: {");
    expect(seoContent).toContain("Professional Profile & Personal Brand Hub");

    // Check Arabic metadata
    expect(seoContent).toContain("ar: {");
    expect(seoContent).toContain("ملف تعريفي احترافي");
    expect(seoContent).toContain("العلامة التجارية الشخصية");
  });

  it("generates localized Organization schema with language attribute", () => {
    const seoPath = join(process.cwd(), "src/lib/i18n/seo.ts");
    const seoContent = readFileSync(seoPath, "utf-8");

    expect(seoContent).toContain("generateLocalizedOrganizationSchema");
    expect(seoContent).toContain("@language");
    expect(seoContent).toContain("inLanguage");
    expect(seoContent).toContain("ar-AE");
    expect(seoContent).toContain("en-US");
  });

  it("generates localized WebSite schema with search capability", () => {
    const seoPath = join(process.cwd(), "src/lib/i18n/seo.ts");
    const seoContent = readFileSync(seoPath, "utf-8");

    expect(seoContent).toContain("generateLocalizedWebsiteSchema");
    expect(seoContent).toContain("SearchAction");
    expect(seoContent).toContain("EntryPoint");
  });

  it("LandingPage uses localized schema generation", () => {
    const landingPath = join(process.cwd(), "src/views/LandingPage.tsx");
    const landingContent = readFileSync(landingPath, "utf-8");

    expect(landingContent).toContain("generateLocalizedOrganizationSchema");
    expect(landingContent).toContain("generateLocalizedWebsiteSchema");
    expect(landingContent).toContain("await getLocale()");
    expect(landingContent).toContain("@language");
  });

  it("LandingPage includes localized descriptions for schemas", () => {
    const landingPath = join(process.cwd(), "src/views/LandingPage.tsx");
    const landingContent = readFileSync(landingPath, "utf-8");

    // Check for ternary operator for Arabic/English descriptions
    expect(landingContent).toContain("locale === \"ar\"");
    expect(landingContent).toContain("مركز العلامة التجارية الشخصية");
    expect(landingContent).toContain("professional profile");
  });

  it("hreflang generation includes x-default fallback", () => {
    const seoPath = join(process.cwd(), "src/lib/i18n/seo.ts");
    const seoContent = readFileSync(seoPath, "utf-8");

    expect(seoContent).toContain("x-default");
    expect(seoContent).toContain("alternates");
  });

  it("supports subdirectory localization pattern", () => {
    const seoPath = join(process.cwd(), "src/lib/i18n/seo.ts");
    const seoContent = readFileSync(seoPath, "utf-8");

    expect(seoContent).toContain("localizedPath");
    expect(seoContent).toContain('locale === "en"');
    expect(seoContent).toContain("locale");
  });
});
