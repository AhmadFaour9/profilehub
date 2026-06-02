export const dynamic = "force-dynamic";
import ProfileEditor from "@/views/dashboard/ProfileEditor";
import { requireMyProfileContent } from "@/lib/profile-data";

export default async function DashboardProfilePage() {
  const content = await requireMyProfileContent("/dashboard/profile");
  return <ProfileEditor content={content} />;
}


