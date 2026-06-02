export const dynamic = "force-dynamic";
import LinksManager from "@/views/dashboard/LinksManager";
import { getMyProfileContent } from "@/lib/profile-data";
import { DashboardDataPending } from "@/components/dashboard/DashboardDataPending";

export default async function DashboardLinksPage() {
  const content = await getMyProfileContent();
  if (!content) return <DashboardDataPending />;
  return <LinksManager initialLinks={content?.links} />;
}


