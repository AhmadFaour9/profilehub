import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { arrangeProjects, groupProjectsByCategory } from "../src/lib/project-catalog";
import { projectFormSchema } from "../src/lib/validation";
import type { Project } from "../src/modules/shared";

const card = readFileSync("src/components/profile/ProjectCard.tsx", "utf8");
const showcase = readFileSync("src/components/profile/ProjectShowcase.tsx", "utf8");
const disclosure = readFileSync("src/components/profile/ProjectsDisclosure.tsx", "utf8");
const profile = readFileSync("src/components/profile/PublicProfile.tsx", "utf8");
const publicData = readFileSync("src/lib/profile-data.ts", "utf8");

function project(id: string, overrides: Partial<Project> = {}): Project {
  return { id, title: id, tags: [], isFeatured: false, createdAt: "2026-01-01T00:00:00Z", ...overrides };
}

const ids = (projects: Project[]) => projects.map((item) => item.id);

describe("arranging projects", () => {
  it("leads with featured projects and keeps the rest for the disclosure", () => {
    const { lead, more } = arrangeProjects([
      project("a"),
      project("b", { isFeatured: true }),
      project("c"),
      project("d", { isFeatured: true }),
    ]);

    expect(ids(lead)).toEqual(["b", "d"]);
    expect(ids(more)).toEqual(["a", "c"]);
  });

  it("hides nothing when the owner has featured nothing", () => {
    // Collapsing work behind a click only pays off once something leads.
    const { lead, more } = arrangeProjects([project("a"), project("b")]);

    expect(ids(lead)).toEqual(["a", "b"]);
    expect(more).toEqual([]);
  });

  it("never shows a project twice", () => {
    const all = [project("a", { isFeatured: true }), project("b"), project("c", { isFeatured: true })];
    const { lead, more } = arrangeProjects(all);

    // Cards carry `id="project-<id>"`, so a duplicate would also break anchors.
    expect([...ids(lead), ...ids(more)].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("grouping projects by category", () => {
  it("orders groups by first appearance, so positions control group order", () => {
    const groups = groupProjectsByCategory([
      project("a", { category: "Vision" }),
      project("b", { category: "Agents" }),
      project("c", { category: "Vision" }),
    ]);

    expect(groups.map((group) => group.category)).toEqual(["Vision", "Agents"]);
    expect(ids(groups[0].projects)).toEqual(["a", "c"]);
  });

  it("treats differently cased categories as one group", () => {
    const groups = groupProjectsByCategory([
      project("a", { category: "RAG" }),
      project("b", { category: " rag " }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("RAG");
  });

  it("collects uncategorised projects into one trailing group", () => {
    const groups = groupProjectsByCategory([
      project("a"),
      project("b", { category: "Agents" }),
      project("c", { category: "  " }),
    ]);

    expect(groups.map((group) => group.category)).toEqual(["Agents", null]);
    expect(ids(groups[1].projects)).toEqual(["a", "c"]);
  });
});

describe("project form validation", () => {
  it("accepts the catalogue fields", () => {
    const parsed = projectFormSchema.parse({
      title: "Regulatory RAG",
      category: "LLM, RAG & Agents",
      status: "Production-ready",
      features: ["Dense retrieval", "Citation grounding"],
      metrics: ["85.2% overall pass rate"],
    });

    expect(parsed.category).toBe("LLM, RAG & Agents");
    expect(parsed.features).toEqual(["Dense retrieval", "Citation grounding"]);
    expect(parsed.metrics).toEqual(["85.2% overall pass rate"]);
  });

  it("leaves the catalogue fields unset when a caller omits them", () => {
    // An update that only changes the description must not blank features.
    const parsed = projectFormSchema.partial().parse({ description: "New text" });

    expect("features" in parsed).toBe(false);
    expect("metrics" in parsed).toBe(false);
  });

  it("strips html from features and results", () => {
    const parsed = projectFormSchema.parse({
      title: "Demo",
      features: ["<b>Fast</b> retrieval"],
      metrics: ["<script>x</script>99%"],
    });

    expect(parsed.features).toEqual(["Fast retrieval"]);
    expect(parsed.metrics).toEqual(["x99%"]);
  });

  it("caps how much one project can carry", () => {
    const many = (count: number) => Array.from({ length: count }, (_, index) => `item ${index}`);

    expect(projectFormSchema.safeParse({ title: "Demo", features: many(25) }).success).toBe(false);
    expect(projectFormSchema.safeParse({ title: "Demo", metrics: many(9) }).success).toBe(false);
    expect(projectFormSchema.safeParse({ title: "Demo", features: ["x".repeat(161)] }).success).toBe(false);
  });
});

describe("project card", () => {
  it("does not wrap the features disclosure in a link", () => {
    // Interactive content inside <a> is invalid, and a click on the summary
    // would follow the link. The card is an article with a stretched title link.
    expect(card).toContain("<article");
    expect(card).toContain("after:absolute after:inset-0");
    expect(card).not.toMatch(/<a[\s\S]*<details[\s\S]*<\/a>/);
  });

  it("keeps the disclosure above the stretched link", () => {
    expect(card).toMatch(/<details className="[^"]*relative z-10/);
  });

  it("discloses features with details/summary, so it needs no state", () => {
    expect(card).toContain("<summary");
    expect(card).toContain("[&::-webkit-details-marker]:hidden");
  });

  it("drops the cover image in the compact variant", () => {
    expect(card).toContain("{!compact && (");
  });
});

describe("project showcase", () => {
  it("is what the public profile renders", () => {
    expect(profile).toContain("<ProjectShowcase projects={visibleProjects} theme={profile.theme} t={t} />");
  });

  it("lists the remaining projects as compact cards under their category", () => {
    expect(showcase).toContain("groupProjectsByCategory(more)");
    expect(showcase).toContain('variant="compact"');
  });

  it("opens the disclosure when a skill link targets a card inside it", () => {
    expect(disclosure).toContain('window.addEventListener("hashchange", reveal)');
    expect(disclosure).toContain("details.contains(target)");
    expect(disclosure).toContain("details.open = true");
  });
});

describe("hidden projects", () => {
  it("never reach the public profile payload", () => {
    // The public read runs with the admin client, which bypasses RLS, so this
    // filter is the only thing keeping an unpublished project off the page.
    expect(publicData).toContain(
      'client.from("projects").select("*").eq("profile_id", profile.id).eq("is_active", true)'
    );
  });
});

describe("catalogue migration", () => {
  const migrations = join(__dirname, "..", "supabase", "migrations");
  const sql = readdirSync(migrations)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => readFileSync(join(migrations, file), "utf8"))
    .join("\n");

  it("adds every column the app writes", () => {
    for (const column of ["category text", "status text", "features text[]", "metrics text[]"]) {
      expect(sql).toContain(`add column if not exists ${column}`);
    }
  });
});
