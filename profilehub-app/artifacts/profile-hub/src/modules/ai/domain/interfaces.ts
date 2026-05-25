export type { AIFeature } from "@/lib/ai/prompts";
import type { AIFeature } from "@/lib/ai/prompts";

export interface AIProviderResult {
  content: string;
  text: string;
  tokensUsed?: number;
  provider: string;
  fallback?: boolean;
}

export interface IAIProvider {
  name: string;
  isConfigured(): boolean;
  generate(feature: AIFeature, input: Record<string, unknown>): Promise<AIProviderResult>;
}

export type AIUsageStatus = "success" | "fallback" | "error";

export type AIUsageRecord = {
  userId: string;
  provider: string;
  feature: string;
  inputTokens?: number;
  outputTokens?: number;
  status: AIUsageStatus;
  errorMessage?: string;
}

export interface IAIRepository {
  recordUsage(record: AIUsageRecord): Promise<void>;
  getDailyUsageCount(userId: string): Promise<number>;
}
