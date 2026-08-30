import type { AIFeature } from "../prompts";
import { minimizeInput } from "../prompts";
import { analyzeResumeHeuristically, buildHeuristicAdvice } from "@/lib/resume/heuristic";

export type AIProviderResponse = {
  content: string;
  text: string;
  provider: string;
  tokensUsed: number;
  fallback?: boolean;
  fallbackMessage?: string;
  debugCode?: string;
  attemptedModels?: string[];
  model?: string;
};

export type AIProvider = {
  name: string;
  model?: string;
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
        case "improve_bio":
          return response(
            `${name} is a ${title} with a clear, practical approach to meaningful work. ` +
              "This improved version keeps the message concise, credible, and visitor-friendly."
          );
        case "suggest_smart_links":
          return response(
            "Suggested Smart Links:\n1. Book a Consultation - primary conversion link\n2. View Portfolio - proof of work\n3. Download Resume - quick hiring context\n4. Latest Project - fresh work highlight\n5. Contact Me - direct next step\n6. GitHub - technical credibility"
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
            JSON.stringify({
              improved:
                "A focused portfolio project that clearly explains the problem, the implementation approach, and the value delivered without overstating results.",
              shorter: "A concise project overview highlighting the problem, approach, and practical value.",
              marketing:
                "A polished project story that helps visitors quickly understand why the work matters and what outcome it supports.",
              technical:
                "A technical project summary covering the core implementation, relevant technologies, and the main engineering decisions.",
            })
          );
        case "suggest_cta":
          return response(
            "CTA ideas:\n- Book a Call\n- View My Work\n- Start a Project\n- Request a Quote\n- Get in Touch\nBest fit: use the action that matches your highest-value visitor intent."
          );
        case "analyze_resume": {
          // Real extraction, not placeholder text: the offline reader still
          // returns schema-valid JSON so the UI renders a usable report.
          const resumeText = typeof input.resumeText === "string" ? input.resumeText : "";
          const result = analyzeResumeHeuristically(resumeText);
          return response(
            JSON.stringify({
              fields: result.fields,
              sectionScores: result.sectionScores,
              advice: buildHeuristicAdvice(result),
              overallScore: result.overallScore,
            })
          );
        }
        case "brand_score":
        case "analyze_brand":
          return response(
            "Personal Brand Score: 78/100\nStrengths: clear positioning, focused presentation, and credible project context.\nImprovements: sharpen the CTA, prioritize the strongest link first, and add more specific project outcomes where appropriate."
          );
      }
    },
  };
}
