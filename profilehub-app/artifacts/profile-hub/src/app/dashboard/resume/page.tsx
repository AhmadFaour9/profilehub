export const dynamic = "force-dynamic";

import ResumeAnalyzer from "@/views/dashboard/ResumeAnalyzer";
import { requireMyProfileContent } from "@/lib/profile-data";

export default async function DashboardResumePage() {
  const content = await requireMyProfileContent("/dashboard/resume");
  return <ResumeAnalyzer profile={content.profile} />;
}
