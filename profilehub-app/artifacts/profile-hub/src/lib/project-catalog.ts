import type { Project } from "@/modules/shared";

/**
 * How a profile's projects are laid out for a reader.
 *
 * A long portfolio shown as one flat list buries the work its owner most wants
 * seen. Featured projects lead; everything else waits behind a disclosure,
 * grouped by the owner's own categories.
 *
 * Kept dependency-free on purpose so the ordering rules stay directly testable.
 */

export type ProjectGroup = {
  /** Null when the owner left these projects uncategorised. */
  category: string | null;
  projects: Project[];
};

/**
 * Splits projects into the ones shown up front and the ones behind "more".
 *
 * A profile that features nothing keeps every project up front: hiding work
 * behind a click only pays off once the owner has said what should lead.
 */
export function arrangeProjects(projects: Project[]): { lead: Project[]; more: Project[] } {
  const featured = projects.filter((project) => project.isFeatured);
  if (!featured.length) return { lead: projects, more: [] };

  return { lead: featured, more: projects.filter((project) => !project.isFeatured) };
}

/**
 * Groups projects by category, in the order each category first appears, so
 * the owner controls group order with the same positions that order projects.
 * Uncategorised projects are collected into one trailing group.
 */
export function groupProjectsByCategory(projects: Project[]): ProjectGroup[] {
  const groups = new Map<string, ProjectGroup>();
  const uncategorised: Project[] = [];

  for (const project of projects) {
    const category = project.category?.trim();
    if (!category) {
      uncategorised.push(project);
      continue;
    }

    // "RAG" and "rag" are one group; the first spelling seen is the label.
    const key = category.toLowerCase();
    if (!groups.has(key)) groups.set(key, { category, projects: [] });
    groups.get(key)!.projects.push(project);
  }

  const result = [...groups.values()];
  if (uncategorised.length) result.push({ category: null, projects: uncategorised });
  return result;
}
