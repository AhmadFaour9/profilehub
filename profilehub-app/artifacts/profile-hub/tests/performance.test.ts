import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("performance optimizations", () => {
  it("includes resource preload hints in layout", () => {
    const layoutPath = join(process.cwd(), "src/app/layout.tsx");
    const layoutContent = readFileSync(layoutPath, "utf-8");

    expect(layoutContent).toContain('rel="preload"');
    expect(layoutContent).toContain('rel="dns-prefetch"');
    expect(layoutContent).toContain('rel="preconnect"');
  });

  it("applies fetchPriority hints to critical images", () => {
    const profileHeaderPath = join(
      process.cwd(),
      "src/components/profile/ProfileHeader.tsx"
    );
    const profileHeaderContent = readFileSync(profileHeaderPath, "utf-8");

    expect(profileHeaderContent).toContain('fetchPriority="high"');
    expect(profileHeaderContent).toContain('loading="eager"');
  });

  it("uses responsive image sizing for gallery", () => {
    const galleryPath = join(process.cwd(), "src/components/profile/GalleryGrid.tsx");
    const galleryContent = readFileSync(galleryPath, "utf-8");

    expect(galleryContent).toContain("sizes=");
    expect(galleryContent).toContain('fetchPriority={');
  });

  it("includes async decoding on all images for performance", () => {
    const projectCardPath = join(
      process.cwd(),
      "src/components/profile/ProjectCard.tsx"
    );
    const projectCardContent = readFileSync(projectCardPath, "utf-8");

    expect(projectCardContent).toContain('decoding="async"');
    expect(projectCardContent).toContain("sizes=");
  });

  it("applies proper loading strategies (eager vs lazy)", () => {
    const profileHeaderPath = join(
      process.cwd(),
      "src/components/profile/ProfileHeader.tsx"
    );
    const profileHeaderContent = readFileSync(profileHeaderPath, "utf-8");

    // Critical resources should be eager-loaded
    expect(profileHeaderContent).toContain('loading="eager"');
  });
});
