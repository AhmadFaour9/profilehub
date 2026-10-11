import type { ProfileTheme, Project } from "@/modules/shared";
import type { Translate } from "@/lib/i18n";
import { arrangeProjects, groupProjectsByCategory } from "@/lib/project-catalog";
import { ProjectCard } from "./ProjectCard";
import { ProjectsDisclosure } from "./ProjectsDisclosure";

/**
 * The body of the public Projects section.
 *
 * Featured projects lead as full cards. The rest sit behind one disclosure as
 * compact cards under their category, so a portfolio of thirty projects still
 * opens on the handful its owner chose rather than on a wall of cards.
 */
export function ProjectShowcase({
  projects,
  theme,
  t,
}: {
  projects: Project[];
  theme?: ProfileTheme;
  t: Translate;
}) {
  const { lead, more } = arrangeProjects(projects);
  const groups = groupProjectsByCategory(more);
  // A lone uncategorised group needs no heading: it would only say "Other".
  const showHeadings = groups.some((group) => group.category);

  return (
    <div className="space-y-6" data-testid="public-projects">
      <div className={`grid gap-6 ${lead.length > 2 ? "sm:grid-cols-2" : ""}`}>
        {lead.map((project) => (
          <ProjectCard key={project.id} project={project} theme={theme} />
        ))}
      </div>

      {more.length > 0 && (
        <ProjectsDisclosure label={t("public.moreProjects", { count: more.length })}>
          {groups.map((group) => (
            <div key={group.category ?? ""} className="space-y-3">
              {showHeadings && (
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <span className="min-w-0 break-words">{group.category ?? t("public.otherProjects")}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 tabular-nums tracking-normal">
                    {group.projects.length}
                  </span>
                </h3>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {group.projects.map((project) => (
                  <ProjectCard key={project.id} project={project} theme={theme} variant="compact" />
                ))}
              </div>
            </div>
          ))}
        </ProjectsDisclosure>
      )}
    </div>
  );
}
