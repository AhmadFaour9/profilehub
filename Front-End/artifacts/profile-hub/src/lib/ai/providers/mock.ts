import type { AIFeature } from "../prompts";
import { minimizeInput } from "../prompts";

export type AIProviderResponse = {
  content: string;
  text: string;
  provider: string;
  tokensUsed: number;
  fallback?: boolean;
};

export type AIProvider = {
  name: string;
  isConfigured(): boolean;
  generate(feature: AIFeature, input: Record<string, unknown>): Promise<AIProviderResponse>;
};

function response(content: string): AIProviderResponse {
  return {
    content,
    text: content,
    provider: "mock",
    tokensUsed: 0,
    fallback: true,
  };
}

export function createMockProvider(): AIProvider {
  return {
    name: "mock",
    isConfigured: () => true,
    async generate(feature, input) {
      const safe = minimizeInput(input);
      const name = safe.displayName || "this professional";
      const title = safe.title || safe.profession || "creator";

      switch (feature) {
        case "generate_bio":
          return response(
            `${name} is a ${title} focused on clear, useful work and a polished digital presence. ` +
              "This draft is generated locally because the live AI provider is not available."
          );
        case "order_links":
          return response(
            "Suggested order:\n1. Main portfolio or website\n2. Booking or contact link\n3. Featured work\n4. Social proof links\n5. Secondary social channels"
          );
        case "project_names":
          return response(
            "Project name ideas:\n- Signature Portfolio Refresh\n- Client Experience Redesign\n- Brand Systems Toolkit\n- Conversion-Focused Landing Page\n- Creator Profile Launch\n- Visual Identity Sprint"
          );
        case "improve_project_description":
          return response(
            "Improved description: A focused project that clarifies the problem, highlights the approach, and shows the value delivered without overclaiming. Add the audience, your role, and one concrete outcome if it is public."
          );
        case "suggest_cta":
          return response(
            "CTA ideas:\n- Book a Call\n- View My Work\n- Start a Project\n- Request a Quote\n- Get in Touch\nBest fit: use the action that matches your highest-value visitor intent."
          );
        case "brand_score":
        case "analyze_brand":
          return response(
            "Personal Brand Score: 78/100\nStrengths: clear positioning, focused presentation, and credible project context.\nImprovements: sharpen the CTA, prioritize the strongest link first, and add more specific project outcomes where appropriate."
          );
      }
    },
  };
}
