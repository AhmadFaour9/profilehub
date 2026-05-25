import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/modules/auth";
import { log } from "@/modules/logging";
import type { AIUsageRecord, IAIRepository } from "../domain/interfaces";

export class SupabaseAIRepository implements IAIRepository {
  constructor(private client: SupabaseClient) {}

  async recordUsage(record: AIUsageRecord): Promise<void> {
    const admin = createSupabaseAdminClient();
    const client = admin || this.client;

    const { error } = await client.from("ai_usage_logs").insert({
      user_id: record.userId,
      provider: record.provider,
      feature: record.feature,
      input_tokens: record.inputTokens || 0,
      output_tokens: record.outputTokens || 0,
      status: record.status,
      error_message: record.errorMessage || null,
    });

    if (error) {
      await log("warn", "ai", "Failed to record AI usage", { reason: error.message });
    }
  }

  async getDailyUsageCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const { count, error } = await this.client
      .from("ai_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "error")
      .gte("created_at", todayStr);

    if (error) {
      await log("warn", "ai", "Failed to get AI usage count", { reason: error.message });
      return 0;
    }

    return count || 0;
  }
}
