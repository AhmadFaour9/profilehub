import ProfileEditor from "@/views/dashboard/ProfileEditor";
import { getMyProfile } from "@/lib/profile-data";

export default async function DashboardProfilePage() {
  const profile = await getMyProfile();
  return <ProfileEditor profile={profile || undefined} />;
}
