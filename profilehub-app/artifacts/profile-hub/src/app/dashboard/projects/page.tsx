export const dynamic = "force-dynamic";
import ProjectsManager from "@/views/dashboard/ProjectsManager";
import { requireMyProfileContent } from "@/lib/profile-data";

export default async function DashboardProjectsPage() {
  const content = await requireMyProfileContent("/dashboard/projects");
  return <ProjectsManager projects={content.projects} />;
}


