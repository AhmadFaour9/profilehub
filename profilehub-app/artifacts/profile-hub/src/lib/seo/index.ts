/**
 * Export centralized SEO utilities and schema generators
 * Provides all advanced schema functions in one location
 */

export {
  generatePersonSchema,
  generateArticleSchema,
  generateProductSchema,
  generateBreadcrumbListSchema,
  generateFAQSchema,
  generateEventSchema,
  generateLocalBusinessSchema,
} from "./advanced-schemas";

export { generateHrefLangAlternates, generateLocalizedOrganizationSchema, generateLocalizedWebsiteSchema, localizedMetadata } from "@/lib/i18n/seo";
