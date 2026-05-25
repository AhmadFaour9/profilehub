import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIFeature } from "../prompts";
import { buildPrompt } from "../prompts";
import type { AIProvider, AIProviderResponse } from "./mock";

export function createGeminiProvider(): AIProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  const client = apiKey ? new GoogleGenerativeAI(apiKey) : null;

  return {
    name: "gemini",
    isConfigured: () => Boolean(client),
    async generate(feature: AIFeature, input: Record<string, unknown>): Promise<AIProviderResponse> {
      if (!client) throw new Error("Gemini API key is missing.");

      const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(buildPrompt(feature, input));
      const geminiResponse = await result.response;
      const content = geminiResponse.text().trim();
      const tokensUsed = geminiResponse.usageMetadata?.totalTokenCount || 0;

      return {
        content,
        text: content,
        provider: "gemini",
        tokensUsed,
        fallback: false,
      };
    },
  };
}
