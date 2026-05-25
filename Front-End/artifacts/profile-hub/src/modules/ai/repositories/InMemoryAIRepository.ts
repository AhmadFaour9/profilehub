import type { AIUsageRecord, IAIRepository } from "../domain/interfaces";

const usageByDay = new Map<string, number>();

function usageKey(userId: string): string {
  return `${userId}:${new Date().toISOString().slice(0, 10)}`;
}

export class InMemoryAIRepository implements IAIRepository {
  async recordUsage(record: AIUsageRecord): Promise<void> {
    if (record.status === "error") return;
    const key = usageKey(record.userId);
    usageByDay.set(key, (usageByDay.get(key) || 0) + 1);
  }

  async getDailyUsageCount(userId: string): Promise<number> {
    return usageByDay.get(usageKey(userId)) || 0;
  }
}
