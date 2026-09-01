import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const section = readFileSync("src/components/profile/SkillsSection.tsx", "utf8");
const card = readFileSync("src/components/profile/ProjectCard.tsx", "utf8");

describe("skills section", () => {
  it("uses details/summary so it needs no JavaScript", () => {
    // Keeps the section a Server Component and keyboard accessible for free.
    expect(section).toContain("<details");
    expect(section).toContain("<summary");
  });

  it("shows category contents by default while keeping them collapsible", () => {
    expect(section).toMatch(/<details[\s\S]*?\sopen[\s>]/);
  });

  it("hides the native marker so the chevron is the only affordance", () => {
    expect(section).toContain("[&::-webkit-details-marker]:hidden");
    expect(section).toContain("list-none");
    expect(section).toContain("group-open:rotate-180");
  });

  it("shows how many skills a collapsed group holds", () => {
    expect(section).toContain("{group.items.length}");
  });

  it("lays categories out as distinct responsive cards", () => {
    expect(section).toContain("grid gap-3 sm:grid-cols-2");
    expect(section).toContain("rounded-2xl");
  });
});

describe("skill to project links", () => {
  it("links a skill to a project that claims it", () => {
    expect(section).toContain("href={`#project-${project.id}`}");
  });

  it("renders a plain chip when no project claims the skill", () => {
    // A link that goes nowhere promises evidence that is not there.
    expect(section).toMatch(/project \? \(/);
    expect(section).toContain("<span className=\"inline-flex max-w-full items-center gap-2 rounded-lg border bg-background");
  });

  it("matches a skill against a differently written tag", () => {
    // "Fine-tuning (PEFT/LoRA)" as a skill should still find a "PEFT" tag.
    expect(section).toContain("const base = key.split(/[(/,]/)[0].trim()");
  });

  it("gives project cards the anchor those links point at", () => {
    expect(card).toContain("id={`project-${project.id}`}");
  });

  it("keeps the linked card clear of the viewport edge and marks it", () => {
    expect(card).toContain("scroll-mt-8");
    expect(card).toContain("target:ring-2");
  });
});
