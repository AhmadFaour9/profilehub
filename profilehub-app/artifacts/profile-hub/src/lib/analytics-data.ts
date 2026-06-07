import "server-only";

import { createSupabaseAdminClient } from "@/modules/auth";
import { createAnalyticsService } from "@/modules/analytics";
import type { AnalyticsBreakdownItem, AnalyticsOverview, AnalyticsRangeSummary, LinkAnalytics, TimeSeriesPoint } from "@/modules/shared";

export async function getDashboardAnalytics(profileId: string): Promise<{
  overview: AnalyticsOverview;
  pageViews: TimeSeriesPoint[];
  linkAnalytics: LinkAnalytics[];
  weeklyViews: TimeSeriesPoint[];
  monthlyViews: TimeSeriesPoint[];
  referrers: AnalyticsBreakdownItem[];
  countries: AnalyticsBreakdownItem[];
  devices: AnalyticsBreakdownItem[];
  rangeSummary: AnalyticsRangeSummary;
}> {
  const client = createSupabaseAdminClient();
  if (!client) {
    return emptyAnalytics();
  }

  // We pass a dummy user ID since we use the admin client here to bypass RLS for aggregation,
  // or we could use the server client with the logged-in user.
  // Assuming the user is fetching their own analytics.
  const service = createAnalyticsService(client, "admin");

  try {
    const data = await service.getDashboardAnalytics(profileId);
    return data as any; 
  } catch {
    return emptyAnalytics();
  }
}

function emptyAnalytics() {
  return {
    overview: emptyOverview(),
    pageViews: lastDays(30),
    linkAnalytics: [],
    weeklyViews: lastWeeks(8),
    monthlyViews: lastMonths(6),
    referrers: [],
    countries: [],
    devices: [],
    rangeSummary: {
      dailyViews: 0,
      weeklyViews: 0,
      monthlyViews: 0,
    },
  };
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

function lastDays(count: number): TimeSeriesPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - index));
    const key = date.toISOString().slice(0, 10);
    return { date: key, value: 0 };
  });
}

function lastWeeks(count: number): TimeSeriesPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - index) * 7);
    const key = `${date.getFullYear()}-W${getWeekNumber(date).toString().padStart(2, "0")}`;
    return { date: key, value: 0 };
  });
}

function lastMonths(count: number): TimeSeriesPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (count - 1 - index));
    const key = date.toISOString().slice(0, 7);
    return { date: key, value: 0 };
  });
}

function getWeekNumber(date: Date): number {
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const days = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
  return Math.ceil((days + firstDay.getUTCDay() + 1) / 7);
}
