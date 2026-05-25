export interface AnalyticsOverview {
  totalViews: number;
  totalClicks: number;
  uniqueVisitors: number;
  viewsThisWeek: number;
  clicksThisWeek: number;
  topCountry: string | null;
  growthRate: number;
  conversionRate: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface LinkAnalytics {
  linkId: string;
  title: string;
  url: string;
  clicks: number;
  percentage: number;
}

export interface DashboardAnalytics {
  overview: AnalyticsOverview;
  pageViews: TimeSeriesPoint[];
  linkAnalytics: LinkAnalytics[];
}

export interface IAnalyticsRepository {
  trackPageView(profileId: string, ipHash?: string, userAgent?: string): Promise<void>;
  getDashboardAnalytics(profileId: string): Promise<DashboardAnalytics>;
}
