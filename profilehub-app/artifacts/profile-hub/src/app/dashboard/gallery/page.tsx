export const dynamic = "force-dynamic";
import GalleryManager from "@/views/dashboard/GalleryManager";
import { getMyProfileContent } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export default async function DashboardGalleryPage() {
  const content = await getMyProfileContent();
  if (!content) redirect("/login");
  return <GalleryManager gallery={content.media} />;
}

