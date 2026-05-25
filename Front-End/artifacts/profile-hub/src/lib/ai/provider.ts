import type { AIFeature } from "./prompts";
import { createGeminiProvider } from "./providers/gemini";
import { createMockProvider, type AIProvider, type AIProviderResponse } from "./providers/mock";

export type { AIFeature, AIProvider, AIProviderResponse };

export function selectProvider(): AIProvider {
  const requested = (process.env.AI_PROVIDER || "").toLowerCase();
  const mock = createMockProvider();

  if (requested === "mock") return mock;

  const gemini = createGeminiProvider();
  if ((requested === "gemini" || !requested) && gemini.isConfigured()) return gemini;

  return mock;
}

export async function runAIForUser(
  _userId: string,
  feature: AIFeature,
  input: Record<string, unknown>
): Promise<AIProviderResponse> {
  const provider = selectProvider();

  try {
    return await provider.generate(feature, input);
  } catch {
    const fallback = await createMockProvider().generate(feature, input);
    return {
      ...fallback,
      content: `${fallback.content}\n\nThe live AI provider is temporarily unavailable, so ProfileHub used a local fallback.`,
      text: `${fallback.text}\n\nThe live AI provider is temporarily unavailable, so ProfileHub used a local fallback.`,
      fallback: true,
    };
  }
}
