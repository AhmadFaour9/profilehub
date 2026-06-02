export const dynamic = "force-dynamic";
import ProjectsManager from "@/views/dashboard/ProjectsManager";
import { getMyProfileContent } from "@/lib/profile-data";
import { DashboardDataPending } from "@/components/dashboard/DashboardDataPending";

export default async function DashboardProjectsPage() {
  const content = await getMyProfileContent();
  if (!content) return <DashboardDataPending />;
  return <ProjectsManager projects={content?.projects} />;
}


