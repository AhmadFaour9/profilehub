import { createMockProvider } from "@/lib/ai/providers/mock";
import type { AIFeature, IAIProvider, AIProviderResult } from "../domain/interfaces";

export class MockProvider implements IAIProvider {
  name = "mock";
  private provider = createMockProvider();

  isConfigured(): boolean {
    return true;
  }

  async generate(feature: AIFeature, input: Record<string, unknown>): Promise<AIProviderResult> {
    return this.provider.generate(feature, input);
  }
}
