import ProfileEditor from "@/views/dashboard/ProfileEditor";
import { getMyProfileContent } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export default async function DashboardProfilePage() {
  const content = await getMyProfileContent();
  if (!content) redirect("/login");
  return <ProfileEditor content={content} />;
}
