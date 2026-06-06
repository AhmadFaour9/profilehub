import { getAppUrl } from "@/lib/env";
import type { AIFeature } from "../prompts";
import { buildPrompt } from "../prompts";
import type { AIProvider, AIProviderResponse } from "./mock";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterMessageContent =
  | string
  | Array<{
      type?: string;
      text?: string;
    }>;

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: OpenRouterMessageContent;
    };
    text?: string;
  }>;
  model?: string;
  usage?: {
    total_tokens?: number;
  };
};

type OpenRouterErrorPayload = {
  error?: {
    message?: string;
    code?: string | number;
  };
  message?: string;
  code?: string | number;
};

export class OpenRouterProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
    readonly shouldFallback = true
  ) {
    super(message);
    this.name = "OpenRouterProviderError";
  }
}

function readEnv(name: string): string {
  return process.env[name]?.trim() || "";
}

function extractContent(payload: OpenRouterResponse): string {
  const choice = payload.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }

  return typeof choice?.text === "string" ? choice.text.trim() : "";
}

function parseErrorPayload(payload: unknown): { message: string; code?: string } {
  if (!payload || typeof payload !== "object") return { message: "OpenRouter request failed." };

  const body = payload as OpenRouterErrorPayload;
  const rawMessage = body.error?.message || body.message || "OpenRouter request failed.";
  const rawCode = body.error?.code ?? body.code;

  return {
    message: String(rawMessage),
    code: rawCode === undefined ? undefined : String(rawCode),
  };
}

function isFallbackError(status: number, message: string, code?: string): boolean {
  const normalized = `${message} ${code || ""}`.toLowerCase();

  return (
    status === 402 ||
    status === 404 ||
    status === 429 ||
    status === 503 ||
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("rate_limit") ||
    normalized.includes("model unavailable") ||
    normalized.includes("model_not_found") ||
    normalized.includes("no endpoints") ||
    normalized.includes("insufficient credits") ||
    normalized.includes("exceeded")
  );
}

async function readJsonOrText(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => "");
}

export function createOpenRouterProvider(): AIProvider {
  const apiKey = readEnv("OPENROUTER_API_KEY");
  const model = readEnv("OPENROUTER_MODEL");

  return {
    name: "openrouter",
    model,
    isConfigured: () => Boolean(apiKey && model),
    async generate(feature: AIFeature, input: Record<string, unknown>): Promise<AIProviderResponse> {
      if (!apiKey) {
        throw new OpenRouterProviderError("OpenRouter API key is missing.", undefined, "missing_api_key", true);
      }

      if (!model) {
        throw new OpenRouterProviderError("OpenRouter model is missing.", undefined, "missing_model", true);
      }

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          "http-referer": getAppUrl(),
          "x-title": "ProfileHub",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are ProfileHub's concise personal-branding assistant. Use only the supplied public context and avoid inventing private facts.",
            },
            {
              role: "user",
              content: buildPrompt(feature, input),
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      const payload = await readJsonOrText(response);

      if (!response.ok) {
        const parsed = parseErrorPayload(payload);
        throw new OpenRouterProviderError(
          parsed.message,
          response.status,
          parsed.code,
          isFallbackError(response.status, parsed.message, parsed.code)
        );
      }

      const parsed = payload as OpenRouterResponse;
      const content = extractContent(parsed);

      if (!content) {
        throw new OpenRouterProviderError("OpenRouter returned an empty response.", response.status, "empty_response", true);
      }

      return {
        content,
        text: content,
        provider: "openrouter",
        model: parsed.model || model,
        tokensUsed: parsed.usage?.total_tokens || 0,
        fallback: false,
      };
    },
  };
}
