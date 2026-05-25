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
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const [totalViews, totalClicks, weekViews, weekClicks, links, recentViews] = await Promise.all([
      this.client.from("page_views").select("id", { count: "exact", head: true }).eq("profile_id", profileId),
      this.client.from("link_clicks").select("id", { count: "exact", head: true }).eq("profile_id", profileId),
      this.client
        .from("page_views")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId)
        .gte("created_at", sevenDaysAgoStr),
      this.client
        .from("link_clicks")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId)
        .gte("created_at", sevenDaysAgoStr),
      this.client.from("links").select("id,title,url,click_count").eq("profile_id", profileId).order("click_count", { ascending: false }).limit(5),
      this.client.from("page_views").select("created_at").eq("profile_id", profileId).gte("created_at", sevenDaysAgoStr),
    ]);

    const views = totalViews.count || 0;
    const clicks = totalClicks.count || 0;
    const dateMap = new Map<string, number>();
    
    for (const row of recentViews.data || []) {
      const date = String(row.created_at).slice(0, 10);
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    }

    const pageViews = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return { date: key, value: dateMap.get(key) || 0 };
    });

    const linkTotal = (links.data || []).reduce((sum, link) => sum + (link.click_count || 0), 0);
    
    const linkAnalytics = (links.data || []).map((link: any) => ({
      linkId: link.id,
      title: link.title,
      url: link.url,
      clicks: link.click_count || 0,
      percentage: linkTotal > 0 ? Math.round(((link.click_count || 0) / linkTotal) * 100) : 0,
    }));

    return {
      overview: {
        totalViews: views,
        totalClicks: clicks,
        uniqueVisitors: Math.round(views * 0.7),
        viewsThisWeek: weekViews.count || 0,
        clicksThisWeek: weekClicks.count || 0,
        topCountry: null,
        growthRate: 0,
        conversionRate: views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0,
      },
      pageViews,
      linkAnalytics,
    };
  }
}
