export const dynamic = "force-dynamic";
import ProjectsManager from "@/views/dashboard/ProjectsManager";
import { getMyProfileContent } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export default async function DashboardProjectsPage() {
  const content = await getMyProfileContent();
  if (!content) return <div className="p-8 text-red-500">Error: Could not load profile content (User session may have dropped during navigation). Please do a hard refresh (Ctrl+F5).</div>;
  return <ProjectsManager projects={content?.projects} />;
}


