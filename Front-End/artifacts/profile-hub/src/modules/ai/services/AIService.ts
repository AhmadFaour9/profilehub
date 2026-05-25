import { log } from "@/modules/logging";
import type { AIFeature, IAIProvider, IAIRepository, AIProviderResult } from "../domain/interfaces";
import { GeminiProvider } from "../providers/GeminiProvider";
import { MockProvider } from "../providers/MockProvider";

const DAILY_LIMIT = 20;

export class AIService {
  private primaryProvider: IAIProvider;
  private fallbackProvider: IAIProvider;

  constructor(
    private aiRepo: IAIRepository,
    private currentUserId?: string
  ) {
    this.primaryProvider = new GeminiProvider();
    this.fallbackProvider = new MockProvider();
  }

  private getActiveProvider(): IAIProvider {
    return this.primaryProvider.isConfigured() ? this.primaryProvider : this.fallbackProvider;
  }

  private async checkRateLimit(userId: string): Promise<void> {
    const usageCount = await this.aiRepo.getDailyUsageCount(userId);
    if (usageCount >= DAILY_LIMIT) {
      throw new Error(`Daily AI limit reached (${DAILY_LIMIT} requests). Please try again tomorrow.`);
    }
  }

  async runAI(feature: AIFeature, input: Record<string, unknown>): Promise<AIProviderResult> {
    if (!this.currentUserId) {
      throw new Error("Unauthorized to use AI features.");
    }

    await this.checkRateLimit(this.currentUserId);

    const provider = this.getActiveProvider();
    let result: AIProviderResult;

    try {
      result = await provider.generate(feature, input);

      this.aiRepo.recordUsage({
        userId: this.currentUserId,
        provider: result.provider,
        feature,
        inputTokens: 0,
        outputTokens: result.tokensUsed || 0,
        status: result.fallback ? "fallback" : "success",
      }).catch((err) => {
        void log("warn", "ai", "Failed to record AI usage", { reason: err instanceof Error ? err.message : "unknown" });
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI provider failed";
      await log("warn", "ai", "AI provider failed", { provider: provider.name, feature, reason: message });

      if (provider.name !== "mock") {
        result = await this.fallbackProvider.generate(feature, input);
        const content = `${result.content}\n\nThe live AI provider is temporarily unavailable, so ProfileHub used a local fallback.`;

        result = {
          ...result,
          content,
          text: content,
          fallback: true,
        };

        this.aiRepo.recordUsage({
          userId: this.currentUserId,
          provider: result.provider,
          feature,
          inputTokens: 0,
          outputTokens: result.tokensUsed || 0,
          status: "fallback",
          errorMessage: message,
        }).catch(() => {});

        return result;
      }

      await this.aiRepo.recordUsage({
        userId: this.currentUserId,
        provider: provider.name,
        feature,
        status: "error",
        errorMessage: message,
      }).catch(() => {});

      throw error;
    }
  }
}
