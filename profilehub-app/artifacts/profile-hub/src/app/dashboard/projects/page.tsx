export const dynamic = "force-dynamic";
import ProjectsManager from "@/views/dashboard/ProjectsManager";
import { getMyProfileContent } from "@/lib/profile-data";

export default async function DashboardProjectsPage() {
  const content = await getMyProfileContent();
  if (!content) return <div className="p-8 text-red-500">Error: Could not load profile data. Please sign in again or check the server logs.</div>;
  return <ProjectsManager projects={content?.projects} />;
}


