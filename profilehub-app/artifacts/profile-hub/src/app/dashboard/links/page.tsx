export const dynamic = "force-dynamic";
import LinksManager from "@/views/dashboard/LinksManager";
import { requireMyProfileContent } from "@/lib/profile-data";

export default async function DashboardLinksPage() {
  const content = await requireMyProfileContent("/dashboard/links");
  return <LinksManager initialLinks={content.links} initialSocialLinks={content.profile.socialLinks || []} />;
}


