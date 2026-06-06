import { log } from "@/modules/logging";
import type { AIFeature, IAIProvider, IAIRepository, AIProviderResult } from "../domain/interfaces";
import { GeminiProvider } from "../providers/GeminiProvider";
import { MockProvider } from "../providers/MockProvider";
import { OpenRouterProvider } from "../providers/OpenRouterProvider";

const DAILY_LIMIT = 20;
const FALLBACK_MESSAGE = "Live AI is temporarily unavailable, so ProfileHub used a safe local suggestion.";

function shouldExposeProviderErrors(): boolean {
  return process.env.VERCEL_ENV === "preview" || process.env.AI_EXPOSE_PROVIDER_ERRORS === "true";
}

export class AIService {
  private primaryProvider: IAIProvider;
  private fallbackProvider: IAIProvider;

  constructor(
    private aiRepo: IAIRepository,
    private currentUserId?: string
  ) {
    this.fallbackProvider = new MockProvider();
    this.primaryProvider = this.selectPrimaryProvider();
  }

  private selectPrimaryProvider(): IAIProvider {
    const requested = (process.env.AI_PROVIDER || "").trim().toLowerCase();

    if (requested === "mock") return this.fallbackProvider;
    if (requested === "openrouter") return new OpenRouterProvider();

    return new GeminiProvider();
  }

  private getActiveProvider(): IAIProvider {
    return this.primaryProvider.isConfigured() ? this.primaryProvider : this.fallbackProvider;
  }

  private withFallbackMessage(result: AIProviderResult, debugCode?: string): AIProviderResult {
    return {
      ...result,
      fallback: true,
      fallbackMessage: FALLBACK_MESSAGE,
      debugCode,
    };
  }

  private async recordUsage(input: {
    provider: string;
    feature: AIFeature;
    status: "success" | "fallback" | "error";
    tokensUsed?: number;
    errorMessage?: string;
  }) {
    this.aiRepo.recordUsage({
      userId: this.currentUserId as string,
      provider: input.provider,
      feature: input.feature,
      inputTokens: 0,
      outputTokens: input.tokensUsed || 0,
      status: input.status,
      errorMessage: input.errorMessage,
    }).catch((err) => {
      void log("warn", "ai", "Failed to record AI usage", { reason: err instanceof Error ? err.message : "unknown" });
    });
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

    const requestedProvider = (process.env.AI_PROVIDER || "").trim().toLowerCase();
    const shouldAttemptPrimary = requestedProvider === "openrouter" && this.primaryProvider.name === "openrouter";
    const provider = shouldAttemptPrimary ? this.primaryProvider : this.getActiveProvider();
    let result: AIProviderResult;

    if (provider.name === "mock" && this.primaryProvider.name !== "mock" && !this.primaryProvider.isConfigured()) {
      await log("warn", "ai", "AI provider fallback", {
        provider: this.primaryProvider.name,
        model: this.primaryProvider.model || "missing",
        status: "fallback",
        reason: "not_configured",
      });

      result = this.withFallbackMessage(await this.fallbackProvider.generate(feature, input));

      await this.recordUsage({
        provider: result.provider,
        feature,
        status: "fallback",
        tokensUsed: result.tokensUsed,
        errorMessage: `${this.primaryProvider.name}_not_configured`,
      });

      return result;
    }

    try {
      result = await provider.generate(feature, input);

      await log("info", "ai", "AI provider completed", {
        provider: result.provider,
        model: provider.model || result.model || "unknown",
        status: result.fallback ? "fallback" : "success",
      });

      await this.recordUsage({
        provider: result.provider,
        feature,
        status: result.fallback ? "fallback" : "success",
        tokensUsed: result.tokensUsed,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI provider failed";
      const errorStatus = error && typeof error === "object" && "status" in error ? String(error.status) : undefined;
      const errorCode = error && typeof error === "object" && "code" in error ? String(error.code) : undefined;
      const debugCode = error && typeof error === "object" && "debugCode" in error ? String(error.debugCode) : undefined;
      const attemptedModels = error && typeof error === "object" && "attemptedModels" in error && Array.isArray(error.attemptedModels)
        ? error.attemptedModels.map(String)
        : undefined;
      const shouldFallback =
        provider.name !== "mock" &&
        !shouldExposeProviderErrors() &&
        (!error || typeof error !== "object" || !("shouldFallback" in error) || Boolean(error.shouldFallback));

      await log(shouldFallback ? "warn" : "error", "ai", shouldFallback ? "AI provider fallback" : "AI provider failed", {
        provider: provider.name,
        model: provider.model || "unknown",
        status: shouldFallback ? "fallback" : "error",
        feature,
        reason: message,
        code: errorCode,
        debugCode,
        httpStatus: errorStatus,
        attemptedModels,
      });

      if (shouldFallback) {
        result = this.withFallbackMessage(await this.fallbackProvider.generate(feature, input), debugCode);
        result.attemptedModels = attemptedModels;

        await this.recordUsage({
          provider: result.provider,
          feature,
          status: "fallback",
          tokensUsed: result.tokensUsed,
          errorMessage: debugCode ? `${debugCode}: ${message}` : message,
        });

        return result;
      }

      await this.recordUsage({
        provider: provider.name,
        feature,
        status: "error",
        errorMessage: debugCode ? `${debugCode}: ${message}` : message,
      });

      throw error;
    }
  }
}
