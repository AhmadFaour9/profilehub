import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const shell = readFileSync("src/components/AppShell.tsx", "utf8");
const resumeAnalyzer = readFileSync("src/views/dashboard/ResumeAnalyzer.tsx", "utf8");
const overview = readFileSync("src/views/dashboard/Overview.tsx", "utf8");
const analytics = readFileSync("src/views/dashboard/Analytics.tsx", "utf8");

describe("dashboard responsive text", () => {
  it("contains overflow at the dashboard shell boundary", () => {
    expect(shell).toContain("min-w-0 overflow-x-hidden");
  });

  it("allows CV links, extracted values, and badges to wrap anywhere", () => {
    expect(resumeAnalyzer).toContain("max-w-full whitespace-normal break-words font-normal [overflow-wrap:anywhere]");
    expect(resumeAnalyzer).toContain("block min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]");
  });

  it("lets flex children shrink before truncating dashboard list labels", () => {
    expect(overview).toContain("min-w-0 flex-1 truncate text-sm font-medium");
    expect(analytics).toContain("min-w-0 flex-1 truncate font-medium");
  });
});
