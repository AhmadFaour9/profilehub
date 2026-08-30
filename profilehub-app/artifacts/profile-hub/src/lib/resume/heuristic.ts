/**
 * Offline resume reader used when no live AI provider is available.
 *
 * It is deliberately conservative: regex-extractable facts (email, phone, URLs,
 * skills from a labelled section) and scores derived from measurable signals
 * such as length, section presence, and how many bullets carry numbers. It never
 * invents a summary — an empty field is more honest than a fabricated one.
 */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /\bhttps?:\/\/[^\s<>()]+|(?:\bwww\.[^\s<>()]+)/i;

const SECTION_PATTERNS: Record<string, RegExp> = {
  summary: /^(summary|profile|about|objective|professional summary|الملخص|نبذة)\b/i,
  experience: /^(experience|work experience|employment|professional experience|الخبرة|الخبرات)\b/i,
  education: /^(education|academic|qualifications|التعليم|المؤهلات)\b/i,
  skills: /^(skills|technical skills|competencies|المهارات)\b/i,
  certifications: /^(certifications?|licenses?|courses|الشهادات)\b/i,
  languages: /^(languages?|اللغات)\b/i,
};

export type HeuristicResult = {
  fields: Record<string, string | string[]>;
  sectionScores: { key: string; score: number; comment: string }[];
  overallScore: number;
};

function splitSections(text: string): Record<string, string[]> {
  const lines = text.split("\n").map((line) => line.trim());
  const sections: Record<string, string[]> = {};
  let current = "header";

  for (const line of lines) {
    if (!line) continue;

    const matched = Object.entries(SECTION_PATTERNS).find(([, pattern]) => pattern.test(line));
    if (matched && line.length < 60) {
      current = matched[0];
      sections[current] ??= [];
      continue;
    }

    sections[current] ??= [];
    sections[current].push(line);
  }

  return sections;
}

const bullets = (lines: string[] | undefined, limit: number): string[] =>
  (lines ?? [])
    .filter((line) => line.length > 8)
    .slice(0, limit)
    .map((line) => line.replace(/^[-•*•\s]+/, "").trim())
    .filter(Boolean);

/** Ratio of experience bullets that contain a number — the quantified-impact signal. */
function quantifiedRatio(lines: string[]): number {
  if (!lines.length) return 0;
  const withNumbers = lines.filter((line) => /\d/.test(line)).length;
  return withNumbers / lines.length;
}

function scoreOf(condition: boolean, strong: number, weak: number): number {
  return condition ? strong : weak;
}

export function analyzeResumeHeuristically(text: string): HeuristicResult {
  const sections = splitSections(text);

  const email = text.match(EMAIL_RE)?.[0] ?? "";
  const phone = text.match(PHONE_RE)?.[0]?.trim() ?? "";
  const website = text.match(URL_RE)?.[0] ?? "";

  // The first short, non-contact line of the header is usually the name.
  const fullName =
    (sections.header ?? []).find(
      (line) => line.length > 2 && line.length < 48 && !EMAIL_RE.test(line) && !PHONE_RE.test(line) && !/\d{4}/.test(line)
    ) ?? "";

  const skills = bullets(sections.skills, 40)
    .flatMap((line) => line.split(/[,،;|]/))
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 1 && skill.length < 50)
    .slice(0, 30);

  const experience = bullets(sections.experience, 20);
  const education = bullets(sections.education, 12);
  const certifications = bullets(sections.certifications, 15);
  const languages = bullets(sections.languages, 12)
    .flatMap((line) => line.split(/[,،;|]/))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);

  const summary = bullets(sections.summary, 6).join(" ").slice(0, 1000);
  const quantified = quantifiedRatio(experience);
  const words = text.split(/\s+/).length;

  const sectionScores = [
    {
      key: "contact",
      score: Math.round(
        (scoreOf(Boolean(email), 40, 0) + scoreOf(Boolean(phone), 30, 0) + scoreOf(Boolean(website), 30, 0))
      ),
      comment: email ? "" : "No email address could be found.",
    },
    {
      key: "summary",
      score: summary ? Math.min(100, 45 + Math.round(summary.length / 12)) : 20,
      comment: summary ? "" : "No summary or profile section was detected.",
    },
    {
      key: "experience",
      score: experience.length ? Math.min(100, 35 + experience.length * 7) : 15,
      comment: experience.length ? "" : "No work experience section was detected.",
    },
    {
      key: "education",
      score: education.length ? Math.min(100, 55 + education.length * 10) : 25,
      comment: education.length ? "" : "No education section was detected.",
    },
    {
      key: "skills",
      score: skills.length ? Math.min(100, 40 + skills.length * 4) : 20,
      comment: skills.length ? "" : "No skills section was detected.",
    },
    {
      key: "impact",
      score: Math.round(quantified * 100),
      comment:
        quantified < 0.4
          ? "Few achievements include concrete numbers or measurable outcomes."
          : "",
    },
    {
      key: "formatting",
      score: words < 150 ? 30 : words > 1400 ? 55 : 80,
      comment:
        words < 150
          ? "The document is very short."
          : words > 1400
            ? "The document is long; consider tightening it."
            : "",
    },
  ];

  const overallScore = Math.round(
    sectionScores.reduce((sum, section) => sum + section.score, 0) / sectionScores.length
  );

  return {
    fields: {
      fullName,
      headline: "",
      summary,
      email,
      phone,
      location: "",
      website,
      skills,
      experience,
      education,
      certifications,
      languages,
    },
    sectionScores,
    overallScore,
  };
}

/** Advice derived from the same measurable signals as the scores. */
export function buildHeuristicAdvice(result: HeuristicResult) {
  const byKey = Object.fromEntries(result.sectionScores.map((s) => [s.key, s.score]));
  const advice: { title: string; detail: string; impact: "high" | "medium" | "low"; field: string | null }[] = [];

  if ((byKey.impact ?? 0) < 50) {
    advice.push({
      title: "Quantify your achievements",
      detail:
        "Most experience bullets have no numbers. Add concrete outcomes — percentages, volumes, time saved, revenue — so a reader can judge scale.",
      impact: "high",
      field: "experience",
    });
  }

  if ((byKey.summary ?? 0) < 50) {
    advice.push({
      title: "Add a professional summary",
      detail:
        "Open with two or three sentences stating your role, your strongest area, and the kind of work you want next.",
      impact: "high",
      field: "summary",
    });
  }

  if ((byKey.skills ?? 0) < 50) {
    advice.push({
      title: "List your skills explicitly",
      detail: "Add a clearly labelled Skills section. Both recruiters and keyword filters look for one.",
      impact: "medium",
      field: "skills",
    });
  }

  if ((byKey.contact ?? 0) < 70) {
    advice.push({
      title: "Complete your contact details",
      detail: "Make sure an email, a phone number, and one portfolio or LinkedIn URL are all easy to find.",
      impact: "high",
      field: "email",
    });
  }

  if ((byKey.formatting ?? 0) < 60) {
    advice.push({
      title: "Adjust the length",
      detail: "Aim for one to two pages of dense, relevant content — long enough to show depth, short enough to read.",
      impact: "medium",
      field: null,
    });
  }

  advice.push({
    title: "Tailor the resume to each role",
    detail: "Mirror the wording of the job description in your summary and skills so the match is obvious.",
    impact: "medium",
    field: null,
  });

  return advice;
}
