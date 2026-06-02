export const dynamic = "force-dynamic";
import ProfileEditor from "@/views/dashboard/ProfileEditor";
import { getMyProfileContent } from "@/lib/profile-data";
import { DashboardDataPending } from "@/components/dashboard/DashboardDataPending";

export default async function DashboardProfilePage() {
  const content = await getMyProfileContent();
  if (!content) return <DashboardDataPending />;
  return <ProfileEditor content={content} />;
}


