import ProjectsManager from "@/views/dashboard/ProjectsManager";
import { getMyProfileContent } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export default async function DashboardProjectsPage() {
  const content = await getMyProfileContent();
  if (!content) redirect("/login");
  return <ProjectsManager projects={content?.projects} />;
}
