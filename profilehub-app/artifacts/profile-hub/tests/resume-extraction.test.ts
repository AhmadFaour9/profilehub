import { describe, expect, it } from "vitest";

import { extractResumeTextFromFile, detectResumeKind } from "../src/lib/resume/extract";
import { parseResumeAnalysis } from "../src/lib/resume/analysis";
import { createMockProvider } from "../src/lib/ai/providers/mock";
import { buildTestResumePdf } from "./helpers/build-pdf";

const RESUME_LINES = [
  "Ahmad Faour",
  "ahmad@example.com | +961 70 123 456 | https://example.com",
  "",
  "Summary",
  "Senior backend engineer with eight years building payment systems.",
  "Focused on reliability and clear API design.",
  "",
  "Experience",
  "Senior Engineer - PayCo (2021-2026) cut checkout latency by 43%",
  "Backend Engineer - ShopCo (2018-2021) scaled orders service to 12000 rps",
  "Junior Developer - StartCo (2016-2018) built internal admin tooling",
  "",
  "Education",
  "BSc Computer Science - Lebanese University (2012-2016)",
  "",
  "Skills",
  "TypeScript, Go, PostgreSQL, Kubernetes, Redis",
  "",
  "Languages",
  "Arabic, English",
];

function pdfFile(name = "cv.pdf"): File {
  const bytes = buildTestResumePdf(RESUME_LINES);
  return new File([bytes], name, { type: "application/pdf" });
}

describe("detectResumeKind", () => {
  it("detects by MIME type", () => {
    expect(detectResumeKind(new File([""], "x", { type: "application/pdf" }))).toBe("pdf");
  });

  it("falls back to the file extension when the MIME type is generic", () => {
    expect(detectResumeKind(new File([""], "cv.pdf", { type: "application/octet-stream" }))).toBe("pdf");
    expect(detectResumeKind(new File([""], "cv.docx", { type: "" }))).toBe("docx");
  });

  it("rejects unsupported formats", () => {
    expect(detectResumeKind(new File([""], "cv.txt", { type: "text/plain" }))).toBeNull();
    expect(detectResumeKind(new File([""], "cv.doc", { type: "application/msword" }))).toBeNull();
  });
});

describe("extractResumeTextFromFile", () => {
  it("extracts readable text from a real PDF", async () => {
    const result = await extractResumeTextFromFile(pdfFile());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.kind).toBe("pdf");
    expect(result.text).toContain("ahmad@example.com");
    expect(result.text).toContain("Senior Engineer - PayCo");
    expect(result.text).toContain("TypeScript");
    expect(result.truncated).toBe(false);
  });

  it("rejects an oversized file before parsing it", async () => {
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.pdf", { type: "application/pdf" });
    const result = await extractResumeTextFromFile(big);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("file_too_large");
  });

  it("rejects an unsupported type", async () => {
    const result = await extractResumeTextFromFile(
      new File(["hello"], "cv.txt", { type: "text/plain" })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("unsupported_type");
  });

  it("reports extract_failed for a corrupt PDF rather than throwing", async () => {
    const result = await extractResumeTextFromFile(
      new File(["not really a pdf"], "cv.pdf", { type: "application/pdf" })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(["extract_failed", "too_short"]).toContain(result.error);
  });
});

describe("PDF through the full analysis chain", () => {
  it("extracts, analyzes, and parses into a usable report", async () => {
    const extraction = await extractResumeTextFromFile(pdfFile());
    expect(extraction.ok).toBe(true);
    if (!extraction.ok) return;

    const response = await createMockProvider().generate("analyze_resume", {
      resumeText: extraction.text,
    });

    const analysis = parseResumeAnalysis(response.content);
    expect(analysis).not.toBeNull();
    if (!analysis) return;

    // Facts that are genuinely in the document.
    expect(analysis.fields.email).toBe("ahmad@example.com");
    expect(analysis.fields.website).toBe("https://example.com");
    expect(analysis.fields.skills).toContain("PostgreSQL");
    expect(analysis.fields.experience.length).toBe(3);

    // Scores stay in range and the average matches the sections shown.
    expect(analysis.averageStrength).toBeGreaterThan(0);
    expect(analysis.averageStrength).toBeLessThanOrEqual(100);
    const mean = Math.round(
      analysis.sectionScores.reduce((sum, s) => sum + s.score, 0) / analysis.sectionScores.length
    );
    expect(analysis.averageStrength).toBe(mean);

    expect(analysis.advice.length).toBeGreaterThan(0);
  });
});
