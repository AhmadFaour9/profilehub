export const dynamic = "force-dynamic";
import GalleryManager from "@/views/dashboard/GalleryManager";
import { requireMyProfileContent } from "@/lib/profile-data";

export default async function DashboardGalleryPage() {
  const content = await requireMyProfileContent("/dashboard/gallery");
  return <GalleryManager gallery={content.media} />;
}


