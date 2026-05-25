import GalleryManager from "@/views/dashboard/GalleryManager";
import { getMyProfileContent } from "@/lib/profile-data";

export default async function DashboardGalleryPage() {
  const content = await getMyProfileContent();
  return <GalleryManager gallery={content?.media} />;
}
