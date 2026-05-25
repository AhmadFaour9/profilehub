import type { IAnalyticsRepository, DashboardAnalytics } from "../domain/interfaces";

export class AnalyticsService {
  constructor(
    private analyticsRepo: IAnalyticsRepository,
    private currentUserId?: string
  ) {}

  async trackPageView(profileId: string, ipHash?: string, userAgent?: string): Promise<void> {
    await this.analyticsRepo.trackPageView(profileId, ipHash, userAgent);
  }

  async getDashboardAnalytics(profileId: string): Promise<DashboardAnalytics> {
    if (!this.currentUserId) {
      throw new Error("Unauthorized to view analytics.");
    }
    
    // We optionally verify ownership if needed, but usually the UI handles that.
    return this.analyticsRepo.getDashboardAnalytics(profileId);
  }
}
