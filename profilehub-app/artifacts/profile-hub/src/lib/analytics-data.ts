import "server-only";

import { createSupabaseAdminClient } from "@/modules/auth";
import { createAnalyticsService } from "@/modules/analytics";
import type { AnalyticsOverview, LinkAnalytics, TimeSeriesPoint } from "@/modules/shared";

export async function getDashboardAnalytics(profileId: string): Promise<{
  overview: AnalyticsOverview;
  pageViews: TimeSeriesPoint[];
  linkAnalytics: LinkAnalytics[];
}> {
  const client = createSupabaseAdminClient();
  if (!client) {
    return {
      overview: emptyOverview(),
      pageViews: lastSevenDays(),
      linkAnalytics: [],
    };
  }

  // We pass a dummy user ID since we use the admin client here to bypass RLS for aggregation,
  // or we could use the server client with the logged-in user.
  // Assuming the user is fetching their own analytics.
  const service = createAnalyticsService(client, "admin");

  try {
    const data = await service.getDashboardAnalytics(profileId);
    return data as any; 
  } catch {
    return { overview: emptyOverview(), pageViews: lastSevenDays(), linkAnalytics: [] };
  }
}

function emptyOverview(): AnalyticsOverview {
  return {
    totalViews: 0,
    totalClicks: 0,
    uniqueVisitors: 0,
    viewsThisWeek: 0,
    clicksThisWeek: 0,
    growthRate: 0,
    conversionRate: 0,
    topCountry: null
  };
}

function lastSevenDays(): TimeSeriesPoint[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { date: key, value: 0 };
  });
}
