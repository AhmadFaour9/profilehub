export const dynamic = "force-dynamic";
import ThemeEditor from "@/views/dashboard/ThemeEditor";
import { getMyProfileContent } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export default async function DashboardThemePage() {
  const content = await getMyProfileContent();
  if (!content) return <div className="p-8 text-red-500">Error: Could not load profile content (User session may have dropped during navigation). Please do a hard refresh (Ctrl+F5).</div>;
  return <ThemeEditor content={content} />;
}


