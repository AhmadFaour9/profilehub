import ThemeEditor from "@/views/dashboard/ThemeEditor";
import { getMyProfile } from "@/lib/profile-data";

export default async function DashboardThemePage() {
  const profile = await getMyProfile();
  return <ThemeEditor profile={profile || undefined} />;
}
