export const dynamic = "force-dynamic";
import Overview from "@/views/dashboard/Overview";
import { getDashboardAnalytics } from "@/lib/analytics-data";
import { getMyProfileContent } from "@/lib/profile-data";
import { DashboardDataPending } from "@/components/dashboard/DashboardDataPending";

export default async function DashboardPage() {
  const content = await getMyProfileContent();
  if (!content) return <DashboardDataPending />;
  const analytics = content ? await getDashboardAnalytics(content.profile.id) : null;
  return (
    <Overview
      profile={content?.profile}
      analytics={analytics?.overview}
      topLinks={analytics?.linkAnalytics}
      links={content?.links}
      projects={content?.projects}
    />
  );
}


