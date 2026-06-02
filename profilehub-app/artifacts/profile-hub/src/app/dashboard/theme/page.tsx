export const dynamic = "force-dynamic";
import ThemeEditor from "@/views/dashboard/ThemeEditor";
import { requireMyProfileContent } from "@/lib/profile-data";

export default async function DashboardThemePage() {
  const content = await requireMyProfileContent("/dashboard/theme");
  return <ThemeEditor content={content} />;
}


