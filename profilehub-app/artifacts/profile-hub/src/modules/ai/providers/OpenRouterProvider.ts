import { createOpenRouterProvider } from "@/lib/ai/providers/openrouter";
import type { AIFeature, AIProviderResult, IAIProvider } from "../domain/interfaces";

export class OpenRouterProvider implements IAIProvider {
  name = "openrouter";
  private provider = createOpenRouterProvider();
  model = this.provider.model;

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  async generate(feature: AIFeature, input: Record<string, unknown>): Promise<AIProviderResult> {
    return this.provider.generate(feature, input);
  }
}
