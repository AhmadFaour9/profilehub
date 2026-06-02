export const dynamic = "force-dynamic";
import ThemeEditor from "@/views/dashboard/ThemeEditor";
import { getMyProfileContent } from "@/lib/profile-data";
import { DashboardDataPending } from "@/components/dashboard/DashboardDataPending";

export default async function DashboardThemePage() {
  const content = await getMyProfileContent();
  if (!content) return <DashboardDataPending />;
  return <ThemeEditor content={content} />;
}


