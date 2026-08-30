export type AIFeature =
  | "generate_bio"
  | "improve_bio"
  | "analyze_brand"
  | "order_links"
  | "suggest_smart_links"
  | "project_names"
  | "improve_project_description"
  | "suggest_cta"
  | "brand_score"
  | "analyze_resume";

type SafeInput = {
  displayName?: string;
  title?: string;
  profession?: string;
  bio?: string;
  tone?: string;
  location?: string;
  project?: {
    id?: string;
    title?: string;
    description?: string;
    repoUrl?: string;
    projectUrl?: string;
    readme?: string;
    technologies?: string[];
    tags?: string[];
  };
  /**
   * Raw resume text. Deliberately exempt from SENSITIVE_KEYS redaction: a CV
   * contains an email and phone by nature and the user asked for them to be
   * extracted. It is never logged and never persisted.
   */
  resumeText?: string;
  locale?: string;
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

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function safeStringArray(value: unknown, maxItems = 12, maxLength = 40): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems) as string[];
}

export function minimizeInput(input: Record<string, unknown>): SafeInput {
  const filtered = Object.fromEntries(
    Object.entries(input).filter(([key]) => !hasSensitiveKey(key))
  );
  const project = safeObject(filtered.project);

  return {
    resumeText: typeof input.resumeText === "string" ? input.resumeText.slice(0, 20000) : undefined,
    locale: cleanText(filtered.locale, 8),
    displayName: cleanText(filtered.displayName ?? filtered.name, 80),
    title: cleanText(filtered.title, 120),
    profession: cleanText(filtered.profession, 120),
    bio: cleanText(filtered.bio, 700),
    tone: cleanText(filtered.tone, 40),
    location: cleanText(filtered.location, 100),
    project: Object.keys(project).length
      ? {
          id: cleanText(project.id ?? filtered.projectId, 80),
          title: cleanText(project.title, 140),
          description: cleanText(project.description, 1200),
          repoUrl: cleanText(project.repoUrl, 2048),
          projectUrl: cleanText(project.projectUrl, 2048),
          readme: cleanText(project.readme, 5000),
          technologies: safeStringArray(project.technologies),
          tags: safeStringArray(project.tags),
        }
      : undefined,
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

    case "improve_bio":
      return [
        "You are a personal branding editor.",
        `Improve the existing public profile bio for ${name}, a ${title}.`,
        "Return 2-3 polished sentences under 80 words.",
        "Keep the voice credible and clear. Do not invent employers, private details, credentials, or metrics.",
        `Safe public context: ${context}`,
      ].join("\n");

    case "suggest_smart_links":
      return [
        "You are designing Smart Links for a public professional profile.",
        "Suggest 6 public action links that would help visitors take useful next steps.",
        "For each link, return: Title, Category, Short description, and why it belongs on the profile.",
        "Do not invent private URLs. Use generic destination ideas when URLs are not provided.",
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
      if (!safe.project?.id) {
        return "No project selected";
      }

      return [
        "Improve the description for exactly one selected portfolio project.",
        "Use only the selected project context below. Never ask which project to use and never infer another project.",
        "Return only valid JSON with these string keys: improved, shorter, marketing, technical.",
        "improved: polished portfolio description under 90 words.",
        "shorter: one concise sentence under 28 words.",
        "marketing: benefit-focused version under 70 words.",
        "technical: implementation-focused version under 80 words.",
        "Keep claims grounded in the title, current description, repository URL, README, tags, and detected technologies.",
        `Safe public context: ${context}`,
      ].join("\n");

    case "suggest_cta":
      return [
        "Suggest clear call-to-action labels for a public profile.",
        "Return 5 short CTA labels and one sentence explaining the best fit.",
        "Avoid aggressive sales language.",
        `Safe public context: ${context}`,
      ].join("\n");

    case "analyze_resume": {
      const language = safe.locale === "ar" ? "Arabic" : "English";
      return [
        "You are an expert technical recruiter and CV reviewer.",
        "Read the RESUME below and return a SINGLE JSON object. No prose, no markdown fences.",
        "",
        "Schema:",
        "{",
        '  "fields": {',
        '    "fullName": string, "headline": string, "summary": string,',
        '    "email": string, "phone": string, "location": string, "website": string,',
        '    "skills": string[], "experience": string[], "education": string[],',
        '    "certifications": string[], "languages": string[], "links": string[]',
        "  },",
        '  "sectionScores": [{ "key": string, "score": 0-100, "comment": string }],',
        '  "advice": [{ "title": string, "detail": string, "impact": "high"|"medium"|"low", "field": string|null }],',
        '  "overallScore": 0-100',
        "}",
        "",
        "Rules:",
        "- For every field EXCEPT headline and summary: extract only what the resume actually states.",
        '  Use "" or [] when it is absent. Never invent an employer, date, credential, or number.',
        '- "headline" and "summary" are DERIVED, not extracted. Always produce them by condensing',
        "  the roles and skills already in the resume. Leave them empty only if the resume is unreadable.",
        '- "experience" entries read "Role - Company (dates)". "education" entries read "Degree - Institution (dates)".',
        '- "summary": 2-3 sentences for a public profile, built only from facts already in the resume.',
        '- "headline": a short professional title inferred from the most recent role and main skills,',
        '  e.g. "Senior Backend Engineer" or "Payments Infrastructure Engineer". Never leave it empty',
        "  when at least one role is present.",
        '- "website" is ONE personal site or portfolio URL only. A contact line usually',
        "  runs several links together; do not return more than one, and never return a",
        "  profile URL here.",
        '- "links": every OTHER URL, one per array entry - LinkedIn, GitHub, and similar.',
        "  Never join links with | or commas inside a single string.",
        "- sectionScores must cover exactly these keys: contact, summary, experience, education, skills, impact, formatting.",
        "- Score each honestly: 0-40 missing or weak, 41-70 acceptable, 71-100 strong. Do not inflate.",
        '- "impact" scores how well achievements are quantified with concrete numbers and outcomes.',
        "- advice: 4-8 specific, actionable items ordered by impact. Reference a fields key in \"field\" when the advice targets one, otherwise null.",
        `- Write every human-readable string (summary, comment, title, detail) in ${language}. Keep JSON keys in English.`,
        "",
        `RESUME:\n${safe.resumeText || ""}`,
      ].join("\n");
    }

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
