import LinksManager from "@/views/dashboard/LinksManager";
import { getMyProfileContent } from "@/lib/profile-data";

export default async function DashboardLinksPage() {
  const content = await getMyProfileContent();
  return <LinksManager initialLinks={content?.links} />;
}
