export const dynamic = "force-dynamic";
import GalleryManager from "@/views/dashboard/GalleryManager";
import { getMyProfileContent } from "@/lib/profile-data";

export default async function DashboardGalleryPage() {
  const content = await getMyProfileContent();
  if (!content) return <div className="p-8 text-red-500">Error: Could not load profile data. Please sign in again or check the server logs.</div>;
  return <GalleryManager gallery={content.media} />;
}


