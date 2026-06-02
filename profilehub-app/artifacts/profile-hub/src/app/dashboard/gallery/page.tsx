export const dynamic = "force-dynamic";
import GalleryManager from "@/views/dashboard/GalleryManager";
import { getMyProfileContent } from "@/lib/profile-data";
import { DashboardDataPending } from "@/components/dashboard/DashboardDataPending";

export default async function DashboardGalleryPage() {
  const content = await getMyProfileContent();
  if (!content) return <DashboardDataPending />;
  return <GalleryManager gallery={content.media} />;
}


