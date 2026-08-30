export const dynamic = "force-dynamic";

import SkillsManager from "@/views/dashboard/SkillsManager";
import { requireMyProfileContent } from "@/lib/profile-data";

export default async function DashboardSkillsPage() {
  const content = await requireMyProfileContent("/dashboard/skills");
  return <SkillsManager skills={content.skills} />;
}
