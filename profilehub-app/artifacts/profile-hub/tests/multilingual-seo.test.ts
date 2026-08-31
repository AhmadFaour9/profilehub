import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("multilingual SEO", () => {
  it("does not advertise locale URLs that the router does not serve", () => {
    const layoutPath = join(process.cwd(), "src/app/layout.tsx");
    const layoutContent = readFileSync(layoutPath, "utf-8");
    const profilePagePath = join(process.cwd(), "src/app/[username]/page.tsx");
    const profilePageContent = readFileSync(profilePagePath, "utf-8");

    expect(layoutContent).not.toContain("generateHrefLangAlternates");
    expect(profilePageContent).not.toContain("generateHrefLangAlternates");
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
    expect(seoContent).toContain("inLanguage: locale");
  });

  it("generates a truthful WebSite schema without an unimplemented search action", () => {
    const seoPath = join(process.cwd(), "src/lib/i18n/seo.ts");
    const seoContent = readFileSync(seoPath, "utf-8");

    expect(seoContent).toContain("generateLocalizedWebsiteSchema");
    expect(seoContent).toContain('"@type": "WebSite"');
    expect(seoContent).not.toContain("SearchAction");
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

});
