import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const header = readFileSync("src/components/profile/ProfileHeader.tsx", "utf8");
const profile = readFileSync("src/components/profile/PublicProfile.tsx", "utf8");
const styles = readFileSync("src/index.css", "utf8");

describe("profile skill orbit", () => {
  it("uses the profile avatar with up to four real skills", () => {
    expect(header).toContain("function ProfileSkillOrbit");
    expect(header).toContain("getSkillIcon(skill.name)");
    expect(header).toContain("if (featured.length === ORBIT_POSITIONS.length) break;");
    expect(header).toContain("<AvatarImage src={profile.avatarUrl || \"\"}");
  });

  it("passes visible profile skills into the header", () => {
    expect(profile).toContain("<ProfileHeader profile={shownProfile} profileUrl={profileUrl} skills={visibleSkills} />");
  });

  it("respects operating-system reduced-motion preferences", () => {
    expect(styles).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(styles).toContain("profile-skill-float");
  });
});
