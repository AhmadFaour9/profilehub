import { ChevronDown, CornerDownRight, Sparkles } from "lucide-react";

import { getCategoryTone, getSkillIcon } from "@/lib/skill-icons";
import type { Project, Skill } from "@/modules/shared";
import type { Translate } from "@/lib/i18n";

/**
 * Skills grouped by category, each group collapsed until the reader opens it.
 *
 * A full stack listed flat is a wall of chips that pushes the rest of the
 * profile below the fold. Collapsed categories keep the shape of someone's
 * expertise readable at a glance - the group names and their sizes - and let a
 * reader open only the area they care about.
 *
 * Built on <details>/<summary> rather than component state: it needs no
 * JavaScript, keeps the section a Server Component, is keyboard accessible and
 * announced correctly by screen readers, and the content is in the HTML so it
 * is still indexed and findable with the browser's own page search.
 *
 * Deliberately no proficiency bars. A self-assigned "Python 90%" is a number
 * the reader cannot verify and every profile sets high. The optional `level` is
 * shown only when the owner wrote something concrete in it.
 */

/** Skill name to the first project whose tags claim it. */
function buildSkillLinks(projects: Project[]): Map<string, Project> {
  const links = new Map<string, Project>();

  for (const project of projects) {
    for (const tag of project.tags ?? []) {
      const key = tag.trim().toLowerCase();
      if (key && !links.has(key)) links.set(key, project);
    }
  }

  return links;
}

/**
 * Matches a skill against project tags, allowing for the way the two are
 * written: "Fine-tuning (PEFT/LoRA)" as a skill, "PEFT" as a tag.
 */
function findProject(skillName: string, links: Map<string, Project>): Project | null {
  const key = skillName.trim().toLowerCase();
  const direct = links.get(key);
  if (direct) return direct;

  const base = key.split(/[(/,]/)[0].trim();
  return links.get(base) ?? null;
}

function groupByCategory(skills: Skill[]): { category: string; items: Skill[] }[] {
  const groups = new Map<string, Skill[]>();

  for (const skill of skills) {
    const key = skill.category.trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(skill);
  }

  return [...groups.entries()]
    .map(([category, items]) => ({
      category,
      items: [...items].sort((a, b) => a.position - b.position),
    }))
    // Bigger groups first: they carry the strongest signal about what someone does.
    .sort((a, b) => b.items.length - a.items.length);
}

export function SkillsSection({
  skills,
  projects = [],
  t,
}: {
  skills: Skill[];
  projects?: Project[];
  t: Translate;
}) {
  const visible = skills.filter((skill) => skill.isActive !== false);
  if (!visible.length) return null;

  const groups = groupByCategory(visible);
  const skillLinks = buildSkillLinks(projects);

  return (
    <section className="space-y-4" data-testid="public-skills">
      <h2 className="text-2xl font-serif">{t("public.skills")}</h2>

      <div className="space-y-2">
        {groups.map((group) => {
          const tone = getCategoryTone(group.category);

          return (
            <details
              key={group.category}
              className="group rounded-xl border bg-card transition-colors"
              data-testid={`skill-group-${group.category}`}
            >
              <summary
                className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 hover:bg-accent/40 [&::-webkit-details-marker]:hidden"
                aria-label={`${group.category} (${group.items.length})`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Sparkles className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden />
                  <span className="truncate text-sm font-medium">{group.category}</span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {group.items.length}
                  </span>
                </span>

                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>

              <ul className="flex flex-wrap gap-2 border-t px-4 py-3">
                {group.items.map((skill) => {
                  const Icon = getSkillIcon(skill.name);
                  const project = findProject(skill.name, skillLinks);

                  const inner = (
                    <>
                      {Icon ? (
                        <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden />
                      ) : (
                        <Sparkles className={`h-3.5 w-3.5 shrink-0 ${tone}`} aria-hidden />
                      )}
                      <span className="font-medium">{skill.name}</span>
                      {skill.level ? (
                        <span className="text-xs text-muted-foreground">{skill.level}</span>
                      ) : null}
                      {project ? (
                        <CornerDownRight
                          className="h-3 w-3 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      ) : null}
                    </>
                  );

                  return (
                    <li key={skill.id}>
                      {/*
                        Only a skill some project actually claims becomes a link.
                        Linking every chip would promise evidence that is not
                        there, and a link that goes nowhere is worse than none.
                      */}
                      {project ? (
                        <a
                          href={`#project-${project.id}`}
                          title={`${skill.name} - ${project.title}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary/60 hover:bg-accent"
                          data-testid={`skill-link-${skill.id}`}
                        >
                          {inner}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm">
                          {inner}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}
