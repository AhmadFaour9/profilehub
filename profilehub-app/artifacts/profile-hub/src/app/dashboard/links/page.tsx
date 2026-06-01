export const dynamic = "force-dynamic";
import LinksManager from "@/views/dashboard/LinksManager";
import { getMyProfileContent } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export default async function DashboardLinksPage() {
  const content = await getMyProfileContent();
  if (!content) redirect("/login?next=/dashboard/links");
  return <LinksManager initialLinks={content?.links} />;
}


