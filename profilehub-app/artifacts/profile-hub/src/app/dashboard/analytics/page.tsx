import Analytics from "@/views/dashboard/Analytics";
import { getDashboardAnalytics } from "@/lib/analytics-data";
import { getMyProfile } from "@/lib/profile-data";

export default async function DashboardAnalyticsPage() {
  const profile = await getMyProfile();
  const analytics = profile ? await getDashboardAnalytics(profile.id) : null;
  return (
    <Analytics
      overview={analytics?.overview}
      pageViews={analytics?.pageViews}
      linkAnalytics={analytics?.linkAnalytics}
    />
  );
}
