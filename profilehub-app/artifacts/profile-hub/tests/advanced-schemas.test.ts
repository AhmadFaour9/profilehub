import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("advanced schema types", () => {
  it("advanced-schemas file exports Person schema generator", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("generatePersonSchema");
    expect(schemasContent).toContain('@type": "Person"');
    expect(schemasContent).toContain("name:");
    expect(schemasContent).toContain("jobTitle");
  });

  it("advanced-schemas file exports Article schema generator", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("generateArticleSchema");
    expect(schemasContent).toContain('@type": "Article"');
    expect(schemasContent).toContain("headline");
    expect(schemasContent).toContain("articleBody");
  });

  it("advanced-schemas file exports Product schema generator", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("generateProductSchema");
    expect(schemasContent).toContain('@type": "Product"');
    expect(schemasContent).toContain("price");
    expect(schemasContent).toContain("Offer");
  });

  it("advanced-schemas file exports BreadcrumbList schema generator", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("generateBreadcrumbListSchema");
    expect(schemasContent).toContain('@type": "BreadcrumbList"');
    expect(schemasContent).toContain("itemListElement");
  });

  it("advanced-schemas file exports FAQ schema generator", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("generateFAQSchema");
    expect(schemasContent).toContain('@type": "FAQPage"');
    expect(schemasContent).toContain("Question");
    expect(schemasContent).toContain("Answer");
  });

  it("advanced-schemas file exports Event schema generator", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("generateEventSchema");
    expect(schemasContent).toContain('@type": "Event"');
    expect(schemasContent).toContain("startDate");
  });

  it("advanced-schemas file exports LocalBusiness schema generator", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("generateLocalBusinessSchema");
    expect(schemasContent).toContain("ProfessionalService");
    expect(schemasContent).toContain("PostalAddress");
  });

  it("SEO index exports all advanced schema generators", () => {
    const seoIndexPath = join(process.cwd(), "src/lib/seo/index.ts");
    const seoIndexContent = readFileSync(seoIndexPath, "utf-8");

    expect(seoIndexContent).toContain("generatePersonSchema");
    expect(seoIndexContent).toContain("generateArticleSchema");
    expect(seoIndexContent).toContain("generateProductSchema");
    expect(seoIndexContent).toContain("generateBreadcrumbListSchema");
    expect(seoIndexContent).toContain("generateFAQSchema");
    expect(seoIndexContent).toContain("generateEventSchema");
    expect(seoIndexContent).toContain("generateLocalBusinessSchema");
  });

  it("SEO index exports localized schema utilities", () => {
    const seoIndexPath = join(process.cwd(), "src/lib/seo/index.ts");
    const seoIndexContent = readFileSync(seoIndexPath, "utf-8");

    expect(seoIndexContent).toContain("generateLocalizedOrganizationSchema");
    expect(seoIndexContent).toContain("generateLocalizedWebsiteSchema");
  });

  it("Person schema generator accepts job title and skills", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("jobTitle");
    expect(schemasContent).toContain("skills");
    expect(schemasContent).toContain("sameAs");
    expect(schemasContent).toContain("worksFor");
  });

  it("Article schema generator accepts author and publisher", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("author");
    expect(schemasContent).toContain("publisher");
    expect(schemasContent).toContain("articleSection");
  });

  it("Product schema generator accepts pricing and ratings", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("aggregateRating");
    expect(schemasContent).toContain("priceCurrency");
    expect(schemasContent).toContain("availability");
  });

  it("Profile page uses a self-referencing canonical URL", () => {
    const profilePagePath = join(process.cwd(), "src/app/[username]/page.tsx");
    const profilePageContent = readFileSync(profilePagePath, "utf-8");

    expect(profilePageContent).toContain("canonical: profileUrl");
    expect(profilePageContent).not.toContain("generateHrefLangAlternates");
  });

  it("LocalBusiness schema supports address and ratings", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("PostalAddress");
    expect(schemasContent).toContain("addressLocality");
    expect(schemasContent).toContain("aggregateRating");
  });

  it("FAQ schema maps questions to answers with proper structure", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("mainEntity");
    expect(schemasContent).toContain("acceptedAnswer");
    expect(schemasContent).toContain("faq.question");
    expect(schemasContent).toContain("faq.answer");
  });

  it("Event schema supports event status and organizer", () => {
    const schemasPath = join(process.cwd(), "src/lib/seo/advanced-schemas.ts");
    const schemasContent = readFileSync(schemasPath, "utf-8");

    expect(schemasContent).toContain("eventStatus");
    expect(schemasContent).toContain("organizer");
    expect(schemasContent).toContain("location");
  });
});
