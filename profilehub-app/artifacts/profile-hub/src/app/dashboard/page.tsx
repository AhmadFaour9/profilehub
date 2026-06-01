export const dynamic = "force-dynamic";
import Overview from "@/views/dashboard/Overview";
import { getDashboardAnalytics } from "@/lib/analytics-data";
import { getMyProfileContent } from "@/lib/profile-data";

export default async function DashboardPage() {
  const content = await getMyProfileContent();
  if (!content) return <div className="p-8 text-red-500">Error: Could not load profile data. Please sign in again or check the server logs.</div>;
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


