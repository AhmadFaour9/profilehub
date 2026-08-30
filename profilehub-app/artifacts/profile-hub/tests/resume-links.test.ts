import { describe, expect, it } from "vitest";

import {
  isProfileLink,
  normalizeLinkCandidate,
  parseResumeAnalysis,
  partitionLinks,
  splitLinkCandidates,
} from "../src/lib/resume/analysis";

/**
 * A CV contact line is one run of text, so a model asked for "website"
 * returns the whole tail of it. That string is not a URL, fails profile
 * validation, and is useless as a suggestion.
 */
const CONTACT_LINE = "linkedin.com/in/ahmad-faour | github.com/ahmadfaour9";

describe("splitLinkCandidates", () => {
  it("splits a contact line on pipes, commas, and spaces", () => {
    expect(splitLinkCandidates(CONTACT_LINE)).toEqual([
      "linkedin.com/in/ahmad-faour",
      "github.com/ahmadfaour9",
    ]);
  });

  it("strips trailing punctuation", () => {
    expect(splitLinkCandidates("example.com/page).")).toEqual(["example.com/page"]);
  });
});

describe("normalizeLinkCandidate", () => {
  it("adds a scheme to a bare domain", () => {
    expect(normalizeLinkCandidate("github.com/x")).toBe("https://github.com/x");
  });

  it("keeps an existing scheme", () => {
    expect(normalizeLinkCandidate("https://a.dev/b")).toBe("https://a.dev/b");
  });

  it("rejects an email address", () => {
    expect(normalizeLinkCandidate("me@example.com")).toBeNull();
    expect(normalizeLinkCandidate("mailto:me@example.com")).toBeNull();
  });

  it("rejects a stray word with no domain", () => {
    expect(normalizeLinkCandidate("Riyadh")).toBeNull();
  });
});

describe("isProfileLink", () => {
  it("recognises profile hosts", () => {
    expect(isProfileLink("https://linkedin.com/in/x")).toBe(true);
    expect(isProfileLink("https://www.github.com/y")).toBe(true);
  });

  it("treats a personal domain as a website", () => {
    expect(isProfileLink("https://ahmadsalehfaour.github.io/Portfolio")).toBe(false);
    expect(isProfileLink("https://example.dev")).toBe(false);
  });
});

describe("partitionLinks", () => {
  it("never leaves two links in the website field", () => {
    const result = partitionLinks(CONTACT_LINE, []);
    expect(result.website).not.toContain("|");
    expect(result.links).toHaveLength(2);
  });

  it("leaves website empty when the CV lists only profiles", () => {
    // Nothing here is a personal site, so inventing one would be wrong.
    expect(partitionLinks(CONTACT_LINE, []).website).toBe("");
  });

  it("picks the personal site as the website and profiles as links", () => {
    const result = partitionLinks(
      "ahmadsalehfaour.github.io/Portfolio | linkedin.com/in/x",
      ["github.com/y"]
    );
    expect(result.website).toBe("https://ahmadsalehfaour.github.io/Portfolio");
    expect(result.links).toContain("https://linkedin.com/in/x");
    expect(result.links).toContain("https://github.com/y");
  });

  it("deduplicates the same link written differently", () => {
    const result = partitionLinks("github.com/x", ["https://github.com/x/"]);
    expect(result.links).toHaveLength(1);
  });
});

describe("the reported case, end to end", () => {
  it("produces a website the profile form would accept", () => {
    const analysis = parseResumeAnalysis(
      JSON.stringify({
        fields: { website: CONTACT_LINE },
        sectionScores: [],
        advice: [],
      })
    );

    expect(analysis).not.toBeNull();
    // Previously this was the whole contact line, which fails z.string().url()
    // and could only ever be rejected after the user clicked "Use this".
    expect(analysis!.fields.website).toBe("");
    expect(analysis!.fields.links).toEqual([
      "https://linkedin.com/in/ahmad-faour",
      "https://github.com/ahmadfaour9",
    ]);
  });

  it("keeps a real portfolio in the website slot", () => {
    const analysis = parseResumeAnalysis(
      JSON.stringify({
        fields: { website: "https://ahmadsalehfaour.github.io/Portfolio/ | github.com/z" },
        sectionScores: [],
        advice: [],
      })
    );
    expect(analysis!.fields.website).toBe("https://ahmadsalehfaour.github.io/Portfolio");
  });
});
