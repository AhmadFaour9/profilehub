import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/dashboard/ResumeDropZone.tsx", "utf8");

/**
 * Drag and drop has a few requirements that are easy to omit and produce a
 * zone that looks right and does nothing.
 */
describe("resume drop zone", () => {
  it("prevents the default on dragOver", () => {
    // Without this the browser navigates to the dropped file and drop never fires.
    expect(source).toMatch(/onDragOver=\{\(event\) => event\.preventDefault\(\)\}/);
  });

  it("handles drop and reads the dropped file", () => {
    expect(source).toContain("onDrop={handleDrop}");
    expect(source).toContain("event.dataTransfer.files");
  });

  it("counts drag depth so the highlight does not flicker over children", () => {
    // dragenter/dragleave fire for descendants too.
    expect(source).toContain("depth.current += 1");
    expect(source).toContain("depth.current -= 1");
  });

  it("keeps click-to-browse working alongside dropping", () => {
    expect(source).toContain("inputRef.current?.click()");
    expect(source).toContain('type="file"');
  });

  it("validates type and size before uploading", () => {
    expect(source).toContain("isSupported");
    expect(source).toContain("MAX_BYTES");
    expect(source).toContain("resume.unsupportedType");
    expect(source).toContain("resume.fileTooLarge");
  });

  it("resets the input so the same file can be chosen twice", () => {
    expect(source).toMatch(/event\.target\.value = ""/);
  });

  it("ignores drops while an analysis is running", () => {
    expect(source).toMatch(/if \(disabled\) return;/);
  });
});
