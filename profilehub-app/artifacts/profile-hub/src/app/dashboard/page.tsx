export const dynamic = "force-dynamic";
import Overview from "@/views/dashboard/Overview";
import { getDashboardAnalytics } from "@/lib/analytics-data";
import { requireMyProfileContent } from "@/lib/profile-data";

export default async function DashboardPage() {
  const content = await requireMyProfileContent("/dashboard");
  const analytics = await getDashboardAnalytics(content.profile.id);
  return (
    <Overview
      profile={content.profile}
      analytics={analytics?.overview}
      topLinks={analytics?.linkAnalytics}
      links={content.links}
      projects={content.projects}
    />
  );
}


