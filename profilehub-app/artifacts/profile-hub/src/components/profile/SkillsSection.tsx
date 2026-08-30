import { Sparkles } from "lucide-react";

import { getCategoryTone, getSkillIcon } from "@/lib/skill-icons";
import type { Skill } from "@/modules/shared";
import type { Translate } from "@/lib/i18n";

/**
 * Skills grouped by category, each chip carrying its brand icon.
 *
 * Deliberately no proficiency bars. A self-assigned "Python 90%" is a number
 * the reader cannot verify and every profile sets high, so it adds noise
 * rather than signal. The optional `level` is shown only when the owner wrote
 * something concrete in it.
 */
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

export function SkillsSection({ skills, t }: { skills: Skill[]; t: Translate }) {
  const visible = skills.filter((skill) => skill.isActive !== false);
  if (!visible.length) return null;

  const groups = groupByCategory(visible);

  return (
    <section className="space-y-5" data-testid="public-skills">
      <h2 className="text-2xl font-serif">{t("public.skills")}</h2>

      <div className="space-y-5">
        {groups.map((group) => {
          const tone = getCategoryTone(group.category);

          return (
            <div key={group.category} className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.category}
              </h3>

              <ul className="flex flex-wrap gap-2">
                {group.items.map((skill) => {
                  const Icon = getSkillIcon(skill.name);

                  return (
                    <li
                      key={skill.id}
                      className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-accent/40"
                    >
                      {Icon ? (
                        <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden />
                      ) : (
                        <Sparkles className={`h-3.5 w-3.5 shrink-0 ${tone}`} aria-hidden />
                      )}
                      <span className="font-medium">{skill.name}</span>
                      {skill.level ? (
                        <span className="text-xs text-muted-foreground">{skill.level}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
