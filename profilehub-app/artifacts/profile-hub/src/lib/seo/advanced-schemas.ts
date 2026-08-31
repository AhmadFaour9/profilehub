/**
 * Advanced structured data schemas for SEO
 * Provides Person, Article, Product, and enhanced BreadcrumbList schemas
 */

/**
 * Generate Person schema for user profiles
 * Used to identify and describe individual professionals
 */
export function generatePersonSchema(profileData: {
  name: string;
  title?: string;
  description?: string;
  image?: string;
  url: string;
  email?: string;
  phone?: string;
  sameAs?: string[]; // Social profiles, LinkedIn, GitHub, etc.
  jobTitle?: string;
  worksFor?: { name: string; url: string };
  skills?: string[];
  knowsAbout?: string[];
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profileData.name,
    url: profileData.url,
  };

  if (profileData.title || profileData.jobTitle) {
    schema.jobTitle = profileData.title || profileData.jobTitle;
  }

  if (profileData.image) {
    schema.image = profileData.image;
  }

  if (profileData.description) {
    schema.description = profileData.description;
  }

  if (profileData.email) {
    schema.email = profileData.email;
  }

  if (profileData.phone) {
    schema.telephone = profileData.phone;
  }

  if (profileData.sameAs && profileData.sameAs.length > 0) {
    schema.sameAs = profileData.sameAs;
  }

  if (profileData.worksFor) {
    schema.worksFor = {
      "@type": "Organization",
      name: profileData.worksFor.name,
      url: profileData.worksFor.url,
    };
  }

  if (profileData.skills && profileData.skills.length > 0) {
    schema.knowsAbout = profileData.skills;
  }

  return schema;
}

/**
 * Generate Article schema for resume content, project descriptions, or blog posts
 * Helps search engines understand and index written content
 */
export function generateArticleSchema(articleData: {
  headline: string;
  description?: string;
  body: string;
  image?: string;
  url: string;
  datePublished: Date | string;
  dateModified?: Date | string;
  author?: { name: string; url?: string };
  authorBy?: { name: string; url?: string }; // Alias for author
  publisher?: { name: string; logo?: string };
  articleSection?: string; // e.g., "Resume", "Projects", "Portfolio"
}): Record<string, unknown> {
  const author = articleData.author || articleData.authorBy;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: articleData.headline,
    articleBody: articleData.body,
    url: articleData.url,
    datePublished: articleData.datePublished,
  };

  if (articleData.description) {
    schema.description = articleData.description;
  }

  if (articleData.image) {
    schema.image = articleData.image;
  }

  if (articleData.dateModified) {
    schema.dateModified = articleData.dateModified;
  }

  if (author) {
    schema.author = {
      "@type": "Person",
      name: author.name,
      ...(author.url && { url: author.url }),
    };
  }

  if (articleData.publisher) {
    schema.publisher = {
      "@type": "Organization",
      name: articleData.publisher.name,
      ...(articleData.publisher.logo && { logo: articleData.publisher.logo }),
    };
  }

  if (articleData.articleSection) {
    schema.articleSection = articleData.articleSection;
  }

  return schema;
}

/**
 * Generate Product schema for services or products offered
 * Enables rich snippets in search results with pricing and reviews
 */
export function generateProductSchema(productData: {
  name: string;
  description?: string;
  image?: string;
  url: string;
  price?: number;
  priceCurrency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder" | "Discontinued";
  brand?: { name: string; url?: string };
  category?: string;
  offers?: Array<{
    price: number;
    priceCurrency: string;
    availability?: string;
  }>;
  aggregateRating?: {
    ratingValue: number;
    ratingCount: number;
    bestRating?: number;
    worstRating?: number;
  };
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productData.name,
    url: productData.url,
  };

  if (productData.description) {
    schema.description = productData.description;
  }

  if (productData.image) {
    schema.image = productData.image;
  }

  if (productData.category) {
    schema.category = productData.category;
  }

  if (productData.brand) {
    schema.brand = {
      "@type": "Brand",
      name: productData.brand.name,
      ...(productData.brand.url && { url: productData.brand.url }),
    };
  }

  // Handle pricing
  if (productData.offers && productData.offers.length > 0) {
    schema.offers = productData.offers.map((offer) => ({
      "@type": "Offer",
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      ...(offer.availability && { availability: offer.availability }),
    }));
  } else if (productData.price !== undefined) {
    schema.offers = {
      "@type": "Offer",
      price: productData.price,
      priceCurrency: productData.priceCurrency || "USD",
      ...(productData.availability && { availability: productData.availability }),
    };
  }

  if (productData.aggregateRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: productData.aggregateRating.ratingValue,
      ratingCount: productData.aggregateRating.ratingCount,
      ...(productData.aggregateRating.bestRating && {
        bestRating: productData.aggregateRating.bestRating,
      }),
      ...(productData.aggregateRating.worstRating && {
        worstRating: productData.aggregateRating.worstRating,
      }),
    };
  }

  return schema;
}

/**
 * Generate enhanced BreadcrumbList schema with multiple levels
 * Improves navigation in search results and site structure visibility
 */
export function generateBreadcrumbListSchema(breadcrumbs: Array<{
  name: string;
  url?: string;
  position?: number;
}>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, idx) => ({
      "@type": "ListItem",
      position: item.position ?? idx + 1,
      name: item.name,
      ...(item.url && { item: item.url }),
    })),
  };
}

/**
 * Generate FAQPage schema for common questions about services
 * Creates rich snippets in search results with expandable Q&A
 */
export function generateFAQSchema(faqs: Array<{
  question: string;
  answer: string;
}>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate Event schema for profile launch or project events
 * Helps search engines understand and index events
 */
export function generateEventSchema(eventData: {
  name: string;
  description?: string;
  image?: string;
  startDate: Date | string;
  endDate?: Date | string;
  url?: string;
  location?: { name: string; url?: string };
  organizer?: { name: string; url?: string };
  eventStatus?: "EventScheduled" | "EventRescheduled" | "EventCancelled" | "EventPostponed";
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: eventData.name,
    startDate: eventData.startDate,
  };

  if (eventData.description) {
    schema.description = eventData.description;
  }

  if (eventData.image) {
    schema.image = eventData.image;
  }

  if (eventData.endDate) {
    schema.endDate = eventData.endDate;
  }

  if (eventData.url) {
    schema.url = eventData.url;
  }

  if (eventData.location) {
    schema.location = {
      "@type": "Place",
      name: eventData.location.name,
      ...(eventData.location.url && { url: eventData.location.url }),
    };
  }

  if (eventData.organizer) {
    schema.organizer = {
      "@type": "Person",
      name: eventData.organizer.name,
      ...(eventData.organizer.url && { url: eventData.organizer.url }),
    };
  }

  if (eventData.eventStatus) {
    schema.eventStatus = `https://schema.org/${eventData.eventStatus}`;
  }

  return schema;
}

/**
 * Generate LocalBusiness schema for freelancers or agency profiles
 * Improves local search visibility
 */
export function generateLocalBusinessSchema(businessData: {
  name: string;
  description?: string;
  image?: string;
  url: string;
  phone?: string;
  email?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  businessType?: "ProfessionalService" | "LocalBusiness" | "Plumber" | "Electrician";
  aggregateRating?: {
    ratingValue: number;
    ratingCount: number;
  };
  priceRange?: string; // e.g., "$$$"
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": businessData.businessType || "ProfessionalService",
    name: businessData.name,
    url: businessData.url,
  };

  if (businessData.description) {
    schema.description = businessData.description;
  }

  if (businessData.image) {
    schema.image = businessData.image;
  }

  if (businessData.phone) {
    schema.telephone = businessData.phone;
  }

  if (businessData.email) {
    schema.email = businessData.email;
  }

  if (businessData.address) {
    schema.address = {
      "@type": "PostalAddress",
      ...(businessData.address.streetAddress && {
        streetAddress: businessData.address.streetAddress,
      }),
      ...(businessData.address.addressLocality && {
        addressLocality: businessData.address.addressLocality,
      }),
      ...(businessData.address.addressRegion && {
        addressRegion: businessData.address.addressRegion,
      }),
      ...(businessData.address.postalCode && {
        postalCode: businessData.address.postalCode,
      }),
      ...(businessData.address.addressCountry && {
        addressCountry: businessData.address.addressCountry,
      }),
    };
  }

  if (businessData.priceRange) {
    schema.priceRange = businessData.priceRange;
  }

  if (businessData.aggregateRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: businessData.aggregateRating.ratingValue,
      ratingCount: businessData.aggregateRating.ratingCount,
    };
  }

  return schema;
}
