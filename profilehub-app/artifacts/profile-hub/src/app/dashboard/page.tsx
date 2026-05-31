import Overview from "@/views/dashboard/Overview";
import { getDashboardAnalytics } from "@/lib/analytics-data";
import { getMyProfileContent } from "@/lib/profile-data";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const content = await getMyProfileContent();
  if (!content) redirect("/login");
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
