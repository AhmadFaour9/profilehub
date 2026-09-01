import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("visitor appearance preferences", () => {
  it("applies the operating-system theme before hydration and keeps browser chrome in sync", () => {
    const layout = read("src/app/layout.tsx");
    const provider = read("src/components/ThemeProvider.tsx");

    expect(layout).toContain('localStorage.getItem("profilehub-theme")');
    expect(layout).toContain('matchMedia("(prefers-color-scheme: dark)")');
    expect(layout).toContain("themeBootstrapScript");
    expect(provider).toContain('window.matchMedia("(prefers-color-scheme: dark)")');
    expect(provider).toContain("document.documentElement.style.colorScheme = resolved");
  });

  it("places language and theme controls inside a public profile rather than floating over it", () => {
    const controls = read("src/components/LanguageToggle.tsx");
    const header = read("src/components/profile/ProfileHeader.tsx");

    expect(controls).toContain("ProfileAppearanceControls");
    expect(controls).toContain('variant="compact"');
    expect(controls).toContain("const authRoutes");
    expect(header).toContain("<ProfileAppearanceControls />");
  });

  it("keeps a custom public-profile background cohesive in dark mode", () => {
    const profile = read("src/components/profile/PublicProfile.tsx");
    const styles = read("src/index.css");

    expect(profile).toContain("public-profile--custom-background");
    expect(styles).toContain(".dark .public-profile--custom-background");
    expect(styles).toContain("hsl(var(--background) / 0.92)");
  });
});
