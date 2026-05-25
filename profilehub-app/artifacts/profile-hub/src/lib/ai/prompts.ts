export type AIFeature =
  | "generate_bio"
  | "analyze_brand"
  | "order_links"
  | "project_names"
  | "improve_project_description"
  | "suggest_cta"
  | "brand_score";

type SafeInput = {
  displayName?: string;
  title?: string;
  profession?: string;
  bio?: string;
  tone?: string;
  location?: string;
  links?: Array<{ title?: string; description?: string; type?: string }>;
  projects?: Array<{ title?: string; description?: string; tags?: string[] }>;
  services?: Array<{ title?: string; description?: string; priceLabel?: string; ctaLabel?: string }>;
};

const SENSITIVE_KEYS = [
  "authorization",
  "cookie",
  "email",
  "ip",
  "key",
  "password",
  "secret",
  "session",
  "token",
  "useragent",
  "user_agent",
];

function cleanText(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function hasSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-\s]/g, "_");
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive));
}

function safeArray<T>(value: unknown, mapper: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 12)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map(mapper);
}

export function minimizeInput(input: Record<string, unknown>): SafeInput {
  const filtered = Object.fromEntries(
    Object.entries(input).filter(([key]) => !hasSensitiveKey(key))
  );

  return {
    displayName: cleanText(filtered.displayName ?? filtered.name, 80),
    title: cleanText(filtered.title, 120),
    profession: cleanText(filtered.profession, 120),
    bio: cleanText(filtered.bio, 700),
    tone: cleanText(filtered.tone, 40),
    location: cleanText(filtered.location, 100),
    links: safeArray(filtered.links, (link) => ({
      title: cleanText(link.title, 80),
      description: cleanText(link.description, 180),
      type: cleanText(link.type, 40),
    })),
    projects: safeArray(filtered.projects, (project) => ({
      title: cleanText(project.title, 100),
      description: cleanText(project.description, 500),
      tags: Array.isArray(project.tags)
        ? project.tags.map((tag) => cleanText(tag, 30)).filter(Boolean).slice(0, 8) as string[]
        : [],
    })),
    services: safeArray(filtered.services, (service) => ({
      title: cleanText(service.title, 100),
      description: cleanText(service.description, 500),
      priceLabel: cleanText(service.priceLabel, 80),
      ctaLabel: cleanText(service.ctaLabel, 60),
    })),
  };
}

export function buildPrompt(feature: AIFeature, input: Record<string, unknown>): string {
  const safe = minimizeInput(input);
  const name = safe.displayName || "the profile owner";
  const title = safe.title || safe.profession || "professional";
  const context = JSON.stringify(safe, null, 2);

  switch (feature) {
    case "generate_bio":
      return [
        "You are a personal branding copywriter.",
        `Write a polished public profile bio for ${name}, a ${title}.`,
        `Tone: ${safe.tone || "professional, warm, and direct"}.`,
        "Use 2-3 concise sentences. Do not invent private details, metrics, employers, or credentials.",
        `Safe public context: ${context}`,
      ].join("\n");

    case "order_links":
      return [
        "You are optimizing a public creator profile.",
        "Suggest the best order for these links. Return a numbered list with a short reason per item.",
        "Use only titles, descriptions, and types. Do not mention hidden analytics.",
        `Safe public context: ${context}`,
      ].join("\n");

    case "project_names":
      return [
        "Suggest 6 concise, portfolio-ready project names.",
        "Keep names specific, credible, and suitable for a professional profile.",
        "Do not invent client names unless the context already includes them.",
        `Safe public context: ${context}`,
      ].join("\n");

    case "improve_project_description":
      return [
        "Improve the project description for a portfolio page.",
        "Return one refined paragraph under 90 words plus 3 optional bullet improvements.",
        "Keep claims grounded in the provided public context.",
        `Safe public context: ${context}`,
      ].join("\n");

    case "suggest_cta":
      return [
        "Suggest clear call-to-action labels for a public profile.",
        "Return 5 short CTA labels and one sentence explaining the best fit.",
        "Avoid aggressive sales language.",
        `Safe public context: ${context}`,
      ].join("\n");

    case "brand_score":
    case "analyze_brand":
      return [
        "You are a brand strategist reviewing a public profile.",
        "Return a Personal Brand Score from 0-100, then 3 strengths and 3 practical improvements.",
        "Base the score only on public, non-sensitive information provided.",
        `Safe public context: ${context}`,
      ].join("\n");
  }
}
