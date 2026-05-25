import ProjectsManager from "@/views/dashboard/ProjectsManager";
import { getMyProfileContent } from "@/lib/profile-data";

export default async function DashboardProjectsPage() {
  const content = await getMyProfileContent();
  return <ProjectsManager projects={content?.projects} />;
}
