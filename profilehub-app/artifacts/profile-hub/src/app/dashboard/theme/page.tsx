export const dynamic = "force-dynamic";
import ThemeEditor from "@/views/dashboard/ThemeEditor";
import { getMyProfileContent } from "@/lib/profile-data";

export default async function DashboardThemePage() {
  const content = await getMyProfileContent();
  if (!content) return <div className="p-8 text-red-500">Error: Could not load profile data. Please sign in again or check the server logs.</div>;
  return <ThemeEditor content={content} />;
}


