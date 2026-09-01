import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const header = readFileSync("src/components/profile/ProfileHeader.tsx", "utf8");
const profile = readFileSync("src/components/profile/PublicProfile.tsx", "utf8");
const styles = readFileSync("src/index.css", "utf8");
const particles = readFileSync("src/components/profile/ProfileParticles.tsx", "utf8");

describe("profile identity motion", () => {
  it("uses the profile avatar with a concise ribbon of real skills", () => {
    expect(header).toContain("function ProfileAvatar");
    expect(header).toContain("function ProfileSkillRibbon");
    expect(header).toContain("getSkillIcon(skill.name)");
    expect(header).toContain("if (highlighted.length === PROFILE_SKILL_LIMIT) break;");
    expect(header).toContain("<AvatarImage src={profile.avatarUrl || \"\"}");
  });

  it("passes visible profile skills into the header", () => {
    expect(profile).toContain("<ProfileHeader profile={shownProfile} profileUrl={profileUrl} skills={visibleSkills} t={t} />");
  });

  it("respects operating-system reduced-motion preferences", () => {
    expect(styles).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("profile-skill-reveal");
    expect(styles).not.toContain("profile-skill-orbit");
  });

  it("keeps particles decorative, lightweight, and motion-aware", () => {
    expect(header).toContain("<ProfileParticles />");
    expect(particles).toContain('"use client"');
    expect(particles).toContain("pauseOnOutsideViewport: true");
    expect(particles).toContain("fpsLimit: 48");
    expect(particles).toContain("prefers-reduced-motion: no-preference");
    expect(particles).toContain('aria-hidden="true"');
  });
});
