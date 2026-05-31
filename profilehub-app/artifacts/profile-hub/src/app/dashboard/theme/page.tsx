export const dynamic = "force-dynamic";
import ThemeEditor from "@/views/dashboard/ThemeEditor";
import { getMyProfileContent } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export default async function DashboardThemePage() {
  const content = await getMyProfileContent();
  if (!content) redirect("/login");
  return <ThemeEditor content={content} />;
}

