import { z } from "zod";

import type { MessageKey } from "@/lib/i18n";

/**
 * The structured shape a resume analysis produces.
 *
 * Model output is untrusted text, so everything is parsed with Zod and clamped
 * before it reaches the UI. A model that returns a 300/100 score, a missing
 * section, or prose instead of JSON degrades to a usable result rather than
 * breaking the page.
 */

export const RESUME_FIELDS = [
  "fullName",
  "headline",
  "summary",
  "email",
  "phone",
  "location",
  "website",
  "skills",
  "experience",
  "education",
  "certifications",
  "languages",
  "links",
] as const;

export type ResumeFieldKey = (typeof RESUME_FIELDS)[number];

export const RESUME_FIELD_LABEL_KEYS: Record<ResumeFieldKey, MessageKey> = {
  fullName: "resume.field.fullName",
  headline: "resume.field.headline",
  summary: "resume.field.summary",
  email: "resume.field.email",
  phone: "resume.field.phone",
  location: "resume.field.location",
  website: "resume.field.website",
  skills: "resume.field.skills",
  experience: "resume.field.experience",
  education: "resume.field.education",
  certifications: "resume.field.certifications",
  languages: "resume.field.languages",
  links: "resume.field.links",
};

/** Which resume fields can be written onto a ProfileHub profile, and where. */
export const PROFILE_FIELD_MAP = {
  fullName: "displayName",
  headline: "profession",
  summary: "bio",
  location: "location",
  website: "website",
} as const satisfies Partial<Record<ResumeFieldKey, string>>;

export type ApplicableResumeField = keyof typeof PROFILE_FIELD_MAP;

export const APPLICABLE_RESUME_FIELDS = Object.keys(PROFILE_FIELD_MAP) as ApplicableResumeField[];

/**
 * A CV contact line is usually one run of text:
 *
 *   Riyadh | +966-... | me@example.com | linkedin.com/in/x | github.com/y
 *
 * so a model asked for "website" happily returns the whole tail of it. That is
 * neither a website nor a valid URL, and offering it as a profile suggestion
 * wastes the reader's time.
 *
 * Candidates are split apart, normalized, then classified: profile URLs go to
 * `links`, and `website` keeps a single personal site.
 *
 * Note on accuracy: PDF text extraction reads the visible label, not the
 * underlying href. A CV that prints a shortened label pointing somewhere else
 * yields the label, so a link is only ever as precise as what the page shows.
 */
const SOCIAL_HOSTS = [
  "linkedin.com",
  "github.com",
  "gitlab.com",
  "x.com",
  "twitter.com",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "medium.com",
  "dev.to",
  "stackoverflow.com",
  "kaggle.com",
  "huggingface.co",
  "behance.net",
  "dribbble.com",
];

export function splitLinkCandidates(value: string): string[] {
  return (value || "")
    .split(/[|,;\s]+/)
    .map((part) => part.trim().replace(/[).,]+$/, ""))
    .filter(Boolean);
}

/** Adds a scheme to a bare domain and drops anything that is not a URL. */
export function normalizeLinkCandidate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  if (raw.startsWith("mailto:") || raw.includes("@")) return null;

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withScheme);
    // A hostname with no dot is a stray word, not a domain.
    if (!url.hostname.includes(".")) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isProfileLink(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return SOCIAL_HOSTS.some((social) => host === social || host.endsWith(`.${social}`));
  } catch {
    return false;
  }
}

/**
 * Splits whatever landed in `website` and `links` into one personal site and a
 * deduplicated list of profile links.
 */
export function partitionLinks(website: string, links: string[]): { website: string; links: string[] } {
  const candidates = [...splitLinkCandidates(website), ...links.flatMap(splitLinkCandidates)];

  const seen = new Set<string>();
  const personal: string[] = [];
  const profiles: string[] = [];

  for (const candidate of candidates) {
    const url = normalizeLinkCandidate(candidate);
    if (!url) continue;

    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    (isProfileLink(url) ? profiles : personal).push(url);
  }

  return {
    // Extra personal sites are still worth keeping, just not in the single
    // website slot the profile has.
    website: personal[0] ?? "",
    links: [...personal.slice(1), ...profiles].slice(0, 12),
  };
}

const clampScore = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const trimmedString = (max: number) =>
  z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .transform((value) => (value.length > max ? value.slice(0, max) : value));

const stringList = (max: number, maxItems: number) =>
  z
    .unknown()
    .transform((value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string" && value.trim()) {
        return value.split(/[,،;\n]/);
      }
      return [];
    })
    .transform((items) =>
      items
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .map((item) => (item.length > max ? item.slice(0, max) : item))
        .slice(0, maxItems)
    );

export const resumeSectionScoreSchema = z.object({
  key: trimmedString(40),
  score: z.unknown().transform(clampScore),
  comment: trimmedString(300).optional().default(""),
});

export const resumeAdviceSchema = z.object({
  title: trimmedString(140),
  detail: trimmedString(600).optional().default(""),
  impact: z
    .unknown()
    .transform((value) => {
      const raw = typeof value === "string" ? value.toLowerCase().trim() : "";
      return raw === "high" || raw === "medium" || raw === "low" ? raw : "medium";
    }),
  field: z
    .unknown()
    .transform((value) =>
      typeof value === "string" && (RESUME_FIELDS as readonly string[]).includes(value)
        ? (value as ResumeFieldKey)
        : null
    ),
});

export const resumeFieldsSchema = z.object({
  fullName: trimmedString(120).optional().default(""),
  headline: trimmedString(160).optional().default(""),
  summary: trimmedString(1200).optional().default(""),
  email: trimmedString(200).optional().default(""),
  phone: trimmedString(60).optional().default(""),
  location: trimmedString(160).optional().default(""),
  website: trimmedString(400).optional().default(""),
  skills: stringList(60, 40).optional().default([]),
  experience: stringList(300, 20).optional().default([]),
  education: stringList(300, 12).optional().default([]),
  certifications: stringList(200, 15).optional().default([]),
  languages: stringList(60, 12).optional().default([]),
  links: stringList(400, 15).optional().default([]),
});

export const resumeAnalysisSchema = z.object({
  fields: resumeFieldsSchema.default({}),
  sectionScores: z.array(resumeSectionScoreSchema).default([]),
  advice: z.array(resumeAdviceSchema).default([]),
  overallScore: z.unknown().transform(clampScore).optional(),
});

export type ResumeFields = z.infer<typeof resumeFieldsSchema>;
export type ResumeSectionScore = z.infer<typeof resumeSectionScoreSchema>;
export type ResumeAdvice = z.infer<typeof resumeAdviceSchema>;

export type ResumeAnalysis = {
  fields: ResumeFields;
  sectionScores: ResumeSectionScore[];
  advice: ResumeAdvice[];
  overallScore: number;
  averageStrength: number;
};

/** True when the model found nothing usable for a field. */
export function isFieldEmpty(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.length === 0;
  return !value || !value.trim();
}

/**
 * Pulls the first JSON object out of a model response. Models routinely wrap
 * JSON in prose or ```json fences, so a plain JSON.parse is not enough.
 */
export function extractJsonObject(raw: string): unknown {
  const text = (raw || "").trim();
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through to brace matching.
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // Try the next candidate.
      }
    }
  }

  return null;
}

/**
 * Derives the headline numbers. The average is computed from the section
 * scores, so "average strength" always matches the bars shown beside it; the
 * model's own overall score is only a fallback when no sections came back.
 */
export function summarizeScores(
  sectionScores: ResumeSectionScore[],
  modelOverall?: number
): { overallScore: number; averageStrength: number } {
  if (!sectionScores.length) {
    const fallback = clampScore(modelOverall ?? 0);
    return { overallScore: fallback, averageStrength: fallback };
  }

  const total = sectionScores.reduce((sum, section) => sum + section.score, 0);
  const averageStrength = Math.round(total / sectionScores.length);

  return {
    overallScore: typeof modelOverall === "number" ? clampScore(modelOverall) : averageStrength,
    averageStrength,
  };
}

export function parseResumeAnalysis(raw: string): ResumeAnalysis | null {
  const json = extractJsonObject(raw);
  if (!json) return null;

  const parsed = resumeAnalysisSchema.safeParse(json);
  if (!parsed.success) return null;

  const { fields, sectionScores, advice, overallScore } = parsed.data;

  // The model routinely returns a whole contact line here; separate it before
  // anything downstream treats it as a single URL.
  const separated = partitionLinks(fields.website, fields.links);
  fields.website = separated.website;
  fields.links = separated.links;
  const scores = summarizeScores(sectionScores, overallScore);

  const impactRank = { high: 0, medium: 1, low: 2 } as const;

  return {
    fields,
    sectionScores,
    advice: [...advice].sort((a, b) => impactRank[a.impact] - impactRank[b.impact]).slice(0, 12),
    ...scores,
  };
}
