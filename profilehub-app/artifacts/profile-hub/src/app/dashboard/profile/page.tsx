import ProfileEditor from "@/views/dashboard/ProfileEditor";
import { getMyProfileContent } from "@/lib/profile-data";

export default async function DashboardProfilePage() {
  const content = await getMyProfileContent();
  return <ProfileEditor content={content} />;
}
