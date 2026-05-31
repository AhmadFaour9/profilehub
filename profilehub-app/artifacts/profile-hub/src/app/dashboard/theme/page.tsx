import ThemeEditor from "@/views/dashboard/ThemeEditor";
import { getMyProfileContent } from "@/lib/profile-data";

export default async function DashboardThemePage() {
  const content = await getMyProfileContent();
  return <ThemeEditor content={content} />;
}
