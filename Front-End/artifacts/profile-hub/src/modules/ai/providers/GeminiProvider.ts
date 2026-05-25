import { createGeminiProvider } from "@/lib/ai/providers/gemini";
import type { AIFeature, IAIProvider, AIProviderResult } from "../domain/interfaces";

export class GeminiProvider implements IAIProvider {
  name = "gemini";
  private provider = createGeminiProvider();

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  async generate(feature: AIFeature, input: Record<string, unknown>): Promise<AIProviderResult> {
    return this.provider.generate(feature, input);
  }
}
