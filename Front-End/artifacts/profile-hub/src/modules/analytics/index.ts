import type { SupabaseClient } from "@supabase/supabase-js";
import { AnalyticsService } from "./services/AnalyticsService";
import { SupabaseAnalyticsRepository } from "./repositories/SupabaseAnalyticsRepository";

export * from "./domain/interfaces";
export { AnalyticsService };

export function createAnalyticsService(client: SupabaseClient, currentUserId?: string): AnalyticsService {
  return new AnalyticsService(
    new SupabaseAnalyticsRepository(client),
    currentUserId
  );
}
