import type { SupabaseClient } from "@supabase/supabase-js";
import type { IAnalyticsRepository, DashboardAnalytics } from "../domain/interfaces";

export class SupabaseAnalyticsRepository implements IAnalyticsRepository {
  constructor(private client: SupabaseClient) {}

  async trackPageView(profileId: string, visitorIdHash?: string, userAgentHash?: string): Promise<void> {
    const { error } = await this.client.from("page_views").insert({
      profile_id: profileId,
      visitor_id_hash: visitorIdHash || "anonymous",
      user_agent_hash: userAgentHash || null,
    });
    
    if (error) {
      console.warn("Failed to track page view:", error.message);
    }
  }

  async getDashboardAnalytics(profileId: string): Promise<DashboardAnalytics> {
    const now = new Date();
    const dayAgo = new Date(now);
    dayAgo.setDate(dayAgo.getDate() - 1);

    const sevenDaysAgo = startOfDay(new Date(now));
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const thirtyDaysAgo = startOfDay(new Date(now));
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    const eightWeeksAgo = startOfDay(new Date(now));
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 7 * 7);

    const sixMonthsAgo = startOfDay(new Date(now));
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const [totalViews, totalClicks, weekViews, weekClicks, links, recentViews] = await Promise.all([
      this.client.from("page_views").select("id", { count: "exact", head: true }).eq("profile_id", profileId),
      this.client.from("smart_link_clicks").select("id", { count: "exact", head: true }).eq("profile_id", profileId),
      this.client
        .from("page_views")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId)
        .gte("created_at", sevenDaysAgoStr),
      this.client
        .from("smart_link_clicks")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId)
        .gte("created_at", sevenDaysAgoStr),
      this.client.from("smart_links").select("id,title,url,click_count").eq("profile_id", profileId).order("click_count", { ascending: false }).limit(5),
      this.client
        .from("page_views")
        .select("created_at,visitor_id_hash,referrer,country,device")
        .eq("profile_id", profileId)
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(10000),
    ]);

    const views = totalViews.count || 0;
    const clicks = totalClicks.count || 0;
    const recentRows = recentViews.data || [];
    const thirtyDayRows = recentRows.filter((row) => new Date(row.created_at) >= thirtyDaysAgo);
    const weekRows = recentRows.filter((row) => new Date(row.created_at) >= sevenDaysAgo);
    const dayRows = recentRows.filter((row) => new Date(row.created_at) >= dayAgo);

    const dateMap = countBy(thirtyDayRows, (row) => String(row.created_at).slice(0, 10));
    const weekMap = countBy(recentRows.filter((row) => new Date(row.created_at) >= eightWeeksAgo), (row) => getWeekKey(new Date(row.created_at)));
    const monthMap = countBy(recentRows, (row) => String(row.created_at).slice(0, 7));

    const pageViews = Array.from({ length: 30 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      const key = date.toISOString().slice(0, 10);
      return { date: key, value: dateMap.get(key) || 0 };
    });

    const weeklyViews = Array.from({ length: 8 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (7 - index) * 7);
      const key = getWeekKey(date);
      return { date: key, value: weekMap.get(key) || 0 };
    });

    const monthlyViews = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      const key = date.toISOString().slice(0, 7);
      return { date: key, value: monthMap.get(key) || 0 };
    });

    const linkTotal = (links.data || []).reduce((sum, link) => sum + (link.click_count || 0), 0);
    
    const linkAnalytics = (links.data || []).map((link: any) => ({
      linkId: link.id,
      title: link.title,
      url: link.url,
      clicks: link.click_count || 0,
      percentage: linkTotal > 0 ? Math.round(((link.click_count || 0) / linkTotal) * 100) : 0,
    }));

    const referrers = breakdown(thirtyDayRows, (row) => normalizeReferrer(row.referrer));
    const countries = breakdown(thirtyDayRows, (row) => normalizeCountry(row.country));
    const devices = breakdown(thirtyDayRows, (row) => row.device || "Unknown");
    const uniqueVisitors = new Set(recentRows.map((row) => row.visitor_id_hash).filter(Boolean)).size;

    return {
      overview: {
        totalViews: views,
        totalClicks: clicks,
        uniqueVisitors,
        viewsThisWeek: weekViews.count || 0,
        clicksThisWeek: weekClicks.count || 0,
        topCountry: countries.find((country) => country.label !== "Unknown")?.label || null,
        growthRate: 0,
        conversionRate: views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0,
      },
      pageViews,
      linkAnalytics,
      weeklyViews,
      monthlyViews,
      referrers,
      countries,
      devices,
      rangeSummary: {
        dailyViews: dayRows.length,
        weeklyViews: weekRows.length,
        monthlyViews: thirtyDayRows.length,
      },
    };
  }
}

function startOfDay(date: Date): Date {
  date.setHours(0, 0, 0, 0);
  return date;
}

function countBy<T>(rows: T[], keyFn: (row: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function breakdown<T>(rows: T[], keyFn: (row: T) => string) {
  const counts = countBy(rows, keyFn);
  const total = rows.length || 0;

  return Array.from(counts.entries())
    .map(([label, value]) => ({
      label,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function getWeekKey(date: Date): string {
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const days = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.ceil((days + firstDay.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()}-W${week.toString().padStart(2, "0")}`;
}

function normalizeReferrer(referrer: string | null): string {
  if (!referrer) return "Direct";

  try {
    return new URL(referrer).hostname.replace(/^www\./, "") || "Direct";
  } catch {
    return "Other";
  }
}

function normalizeCountry(country: string | null): string {
  const value = country?.trim().toUpperCase();
  return value || "Unknown";
}
