import { describe, expect, it } from "vitest";

import {
  extractJsonObject,
  isFieldEmpty,
  parseResumeAnalysis,
  summarizeScores,
} from "../src/lib/resume/analysis";
import { analyzeResumeHeuristically, buildHeuristicAdvice } from "../src/lib/resume/heuristic";
import { normalizeResumeText, prepareResumeText } from "../src/lib/resume/extract";

const SAMPLE_RESUME = `
Ahmad Faour
ahmad@example.com | +961 70 123 456 | https://example.com

Summary
Senior backend engineer with eight years building payment systems.
Focused on reliability and clear API design.

Experience
Senior Engineer - PayCo (2021-2026) improved checkout latency by 43%
Backend Engineer - ShopCo (2018-2021) scaled orders service to 12000 rps
Junior Developer - StartCo (2016-2018) built internal admin tools

Education
BSc Computer Science - Lebanese University (2012-2016)

Skills
TypeScript, Go, PostgreSQL, Kubernetes, Redis

Languages
Arabic, English
`;

describe("extractJsonObject", () => {
  it("parses a bare JSON object", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a markdown fence", () => {
    expect(extractJsonObject('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it("recovers JSON surrounded by prose", () => {
    expect(extractJsonObject('Sure! Here you go:\n{"a":3}\nHope that helps.')).toEqual({ a: 3 });
  });

  it("returns null when there is no JSON", () => {
    expect(extractJsonObject("I cannot help with that.")).toBeNull();
  });
});

describe("summarizeScores", () => {
  it("averages the section scores", () => {
    const result = summarizeScores([
      { key: "a", score: 80, comment: "" },
      { key: "b", score: 60, comment: "" },
    ]);
    expect(result.averageStrength).toBe(70);
  });

  it("falls back to the model score when no sections came back", () => {
    expect(summarizeScores([], 55)).toEqual({ overallScore: 55, averageStrength: 55 });
  });

  it("keeps the average independent of the model's overall score", () => {
    const result = summarizeScores([{ key: "a", score: 40, comment: "" }], 90);
    expect(result.overallScore).toBe(90);
    expect(result.averageStrength).toBe(40);
  });
});

describe("parseResumeAnalysis", () => {
  it("clamps out-of-range scores instead of trusting the model", () => {
    const analysis = parseResumeAnalysis(
      JSON.stringify({
        fields: { fullName: "Test User" },
        sectionScores: [
          { key: "contact", score: 300 },
          { key: "skills", score: -20 },
        ],
        advice: [],
        overallScore: 999,
      })
    );

    expect(analysis).not.toBeNull();
    expect(analysis!.sectionScores[0].score).toBe(100);
    expect(analysis!.sectionScores[1].score).toBe(0);
    expect(analysis!.overallScore).toBe(100);
  });

  it("orders advice by impact", () => {
    const analysis = parseResumeAnalysis(
      JSON.stringify({
        fields: {},
        sectionScores: [],
        advice: [
          { title: "low one", impact: "low" },
          { title: "high one", impact: "high" },
          { title: "medium one", impact: "medium" },
        ],
      })
    );

    expect(analysis!.advice.map((a) => a.impact)).toEqual(["high", "medium", "low"]);
  });

  it("defaults an unknown impact to medium", () => {
    const analysis = parseResumeAnalysis(
      JSON.stringify({ fields: {}, sectionScores: [], advice: [{ title: "x", impact: "urgent" }] })
    );
    expect(analysis!.advice[0].impact).toBe("medium");
  });

  it("coerces a comma-separated string into a list", () => {
    const analysis = parseResumeAnalysis(
      JSON.stringify({ fields: { skills: "Go, Rust, SQL" }, sectionScores: [], advice: [] })
    );
    expect(analysis!.fields.skills).toEqual(["Go", "Rust", "SQL"]);
  });

  it("returns null for non-JSON output", () => {
    expect(parseResumeAnalysis("The model refused.")).toBeNull();
  });
});

describe("isFieldEmpty", () => {
  it("treats blank strings and empty arrays as empty", () => {
    expect(isFieldEmpty("")).toBe(true);
    expect(isFieldEmpty("   ")).toBe(true);
    expect(isFieldEmpty([])).toBe(true);
    expect(isFieldEmpty("value")).toBe(false);
    expect(isFieldEmpty(["value"])).toBe(false);
  });
});

describe("normalizeResumeText", () => {
  it("collapses ragged whitespace from PDF extraction", () => {
    const { text } = normalizeResumeText("A   line\r\n\r\n\r\n  Another   line  ");
    expect(text).toBe("A line\n\nAnother line");
  });

  it("flags truncation for very long documents", () => {
    const { truncated } = normalizeResumeText("x".repeat(25_000));
    expect(truncated).toBe(true);
  });
});

describe("prepareResumeText", () => {
  it("rejects text that is too short to be a CV", () => {
    const result = prepareResumeText("Ahmad Faour, engineer.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("too_short");
  });

  it("accepts a full resume", () => {
    const result = prepareResumeText(SAMPLE_RESUME);
    expect(result.ok).toBe(true);
  });
});

describe("analyzeResumeHeuristically", () => {
  const result = analyzeResumeHeuristically(SAMPLE_RESUME);

  it("extracts contact details with regex, not guesswork", () => {
    expect(result.fields.email).toBe("ahmad@example.com");
    expect(result.fields.website).toBe("https://example.com");
    expect(String(result.fields.phone)).toContain("961");
  });

  it("reads labelled sections", () => {
    expect(result.fields.skills).toContain("TypeScript");
    expect(result.fields.skills).toContain("Kubernetes");
    expect((result.fields.experience as string[]).length).toBe(3);
    expect((result.fields.education as string[]).length).toBe(1);
  });

  it("never invents a summary it did not read", () => {
    const bare = analyzeResumeHeuristically(
      "Some Name\nno-reply@example.com\n" + "filler content ".repeat(30)
    );
    expect(bare.fields.summary).toBe("");
    expect(bare.fields.headline).toBe("");
  });

  it("rewards quantified achievements", () => {
    const impact = result.sectionScores.find((s) => s.key === "impact");
    // Every experience bullet in the sample carries a number.
    expect(impact!.score).toBeGreaterThan(60);
  });

  it("penalizes experience with no numbers", () => {
    const vague = analyzeResumeHeuristically(
      "Name\na@b.com\n\nExperience\nWorked on things at a company for a while\nHelped the team with various tasks\n\nSkills\nThings"
    );
    const impact = vague.sectionScores.find((s) => s.key === "impact");
    expect(impact!.score).toBe(0);
  });

  it("produces scores that all sit within 0-100", () => {
    for (const section of result.sectionScores) {
      expect(section.score).toBeGreaterThanOrEqual(0);
      expect(section.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("buildHeuristicAdvice", () => {
  it("advises quantifying when impact is weak", () => {
    const vague = analyzeResumeHeuristically(
      "Name\na@b.com\n\nExperience\nWorked on things at a company\nHelped the team\n\nSkills\nThings"
    );
    const advice = buildHeuristicAdvice(vague);
    expect(advice.some((a) => a.field === "experience" && a.impact === "high")).toBe(true);
  });

  it("always returns at least one suggestion", () => {
    expect(buildHeuristicAdvice(analyzeResumeHeuristically(SAMPLE_RESUME)).length).toBeGreaterThan(0);
  });
});

describe("mock provider end to end", () => {
  it("produces output the parser accepts", async () => {
    const { createMockProvider } = await import("../src/lib/ai/providers/mock");
    const response = await createMockProvider().generate("analyze_resume", {
      resumeText: SAMPLE_RESUME,
    });

    const analysis = parseResumeAnalysis(response.content);
    expect(analysis).not.toBeNull();
    expect(analysis!.fields.email).toBe("ahmad@example.com");
    expect(analysis!.sectionScores.length).toBe(7);
    expect(analysis!.averageStrength).toBeGreaterThan(0);
  });
});
