import { PRODUCTION_APP_URL } from "@/lib/profile-url";
import type { AIFeature } from "../prompts";
import { buildPrompt } from "../prompts";
import type { AIProvider, AIProviderResponse } from "./mock";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_REFERER = PRODUCTION_APP_URL;
const MAX_LOG_STRING_LENGTH = 800;
const DEFAULT_FALLBACK_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.1-8b-instruct:free",
];

export type OpenRouterDebugCode =
  | "openrouter_missing_key"
  | "openrouter_model_unavailable"
  | "openrouter_rate_limited"
  | "openrouter_quota_exceeded"
  | "openrouter_auth_failed"
  | "openrouter_bad_request";

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
    readonly debugCode: OpenRouterDebugCode = "openrouter_bad_request",
    readonly shouldFallback = true,
    readonly attemptedModels: string[] = []
  ) {
    super(message);
    this.name = "OpenRouterProviderError";
  }
}

function readEnv(name: string): string {
  return process.env[name]?.trim() || "";
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function configuredFallbackModels(): string[] {
  const configured = readEnv("OPENROUTER_FALLBACK_MODELS");
  const models = configured
    ? configured.split(",").map((model) => model.trim())
    : DEFAULT_FALLBACK_MODELS;

  return uniqueValues(models);
}

function safeLogValue(value: unknown): unknown {
  if (typeof value === "string") return value.slice(0, MAX_LOG_STRING_LENGTH);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 8).map(safeLogValue);
  if (!value || typeof value !== "object") return undefined;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      const normalized = key.toLowerCase();
      const isExistenceFlag = normalized.endsWith("_exists") || normalized.endsWith("exists");
      if (
        !isExistenceFlag &&
        (normalized.includes("key") ||
          normalized.includes("token") ||
          normalized.includes("secret") ||
          normalized.includes("authorization") ||
          normalized.includes("cookie"))
      ) {
        return [key, "[redacted]"];
      }

      return [key, safeLogValue(entry)];
    })
  );
}

function logOpenRouter(level: "info" | "warn", event: string, metadata: Record<string, unknown>) {
  const safe = safeLogValue(metadata);
  const writer = level === "warn" ? console.warn : console.info;
  writer(`[ai] ${event}`, safe);
}

function safeLogString(value: unknown): string {
  try {
    return JSON.stringify(safeLogValue(value)).slice(0, MAX_LOG_STRING_LENGTH);
  } catch {
    return "\"[unserializable]\"";
  }
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

function getDebugCode(status: number, message: string, code?: string): OpenRouterDebugCode {
  const normalized = `${message} ${code || ""}`.toLowerCase();

  if (status === 401 || status === 403) return "openrouter_auth_failed";
  if (
    status === 402 ||
    normalized.includes("quota") ||
    normalized.includes("credit") ||
    normalized.includes("credits") ||
    normalized.includes("insufficient") ||
    normalized.includes("billing")
  ) {
    return "openrouter_quota_exceeded";
  }
  if (
    status === 429 ||
    normalized.includes("rate limit") ||
    normalized.includes("rate_limit") ||
    normalized.includes("exceeded")
  ) {
    return "openrouter_rate_limited";
  }
  if (
    status === 404 ||
    status === 503 ||
    normalized.includes("model") ||
    normalized.includes("no endpoints") ||
    normalized.includes("not found") ||
    normalized.includes("unavailable")
  ) {
    return "openrouter_model_unavailable";
  }

  return "openrouter_bad_request";
}

function shouldTryFallbackModel(debugCode: OpenRouterDebugCode): boolean {
  return ["openrouter_model_unavailable", "openrouter_rate_limited", "openrouter_bad_request"].includes(debugCode);
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
  const requestedProvider = readEnv("AI_PROVIDER") || "default";
  const fallbackModels = configuredFallbackModels();
  const modelAttempts = uniqueValues([model, ...fallbackModels]);

  return {
    name: "openrouter",
    model,
    isConfigured: () => Boolean(apiKey && model),
    async generate(feature: AIFeature, input: Record<string, unknown>): Promise<AIProviderResponse> {
      logOpenRouter("info", "openrouter_request_started", {
        AI_PROVIDER: requestedProvider,
        OPENROUTER_MODEL: model || "missing",
        OPENROUTER_FALLBACK_MODELS: fallbackModels,
        OPENROUTER_API_KEY_exists: Boolean(apiKey),
        referer: OPENROUTER_REFERER,
        feature,
      });

      if (!apiKey) {
        throw new OpenRouterProviderError(
          "OpenRouter API key is missing.",
          undefined,
          "missing_api_key",
          "openrouter_missing_key",
          true,
          []
        );
      }

      if (!model) {
        throw new OpenRouterProviderError(
          "OpenRouter model is missing.",
          undefined,
          "missing_model",
          "openrouter_model_unavailable",
          true,
          []
        );
      }

      let lastError: OpenRouterProviderError | null = null;

      for (const attemptedModel of modelAttempts) {
        try {
          return await requestOpenRouter({
            apiKey,
            requestedProvider,
            configuredModel: model,
            attemptedModel,
            fallbackModels,
            feature,
            input,
          });
        } catch (error) {
          const providerError =
            error instanceof OpenRouterProviderError
              ? error
              : new OpenRouterProviderError(
                  error instanceof Error ? error.message : "OpenRouter request failed.",
                  undefined,
                  "request_failed",
                  "openrouter_bad_request",
                  true,
                  [attemptedModel]
                );
          lastError = providerError;

          if (!shouldTryFallbackModel(providerError.debugCode)) {
            throw new OpenRouterProviderError(
              providerError.message,
              providerError.status,
              providerError.code,
              providerError.debugCode,
              true,
              uniqueValues([...(providerError.attemptedModels || []), attemptedModel])
            );
          }

          const nextModel = modelAttempts[modelAttempts.indexOf(attemptedModel) + 1];
          if (!nextModel) break;

          logOpenRouter("warn", "openrouter_model_fallback_attempt", {
            AI_PROVIDER: requestedProvider,
            OPENROUTER_MODEL: model,
            failedModel: attemptedModel,
            nextModel,
            debugCode: providerError.debugCode,
            httpStatus: providerError.status,
            errorMessage: providerError.message,
          });
        }
      }

      throw new OpenRouterProviderError(
        lastError?.message || "OpenRouter request failed.",
        lastError?.status,
        lastError?.code,
        lastError?.debugCode || "openrouter_bad_request",
        true,
        modelAttempts
      );
    },
  };
}

async function requestOpenRouter({
  apiKey,
  requestedProvider,
  configuredModel,
  attemptedModel,
  fallbackModels,
  feature,
  input,
}: {
  apiKey: string;
  requestedProvider: string;
  configuredModel: string;
  attemptedModel: string;
  fallbackModels: string[];
  feature: AIFeature;
  input: Record<string, unknown>;
}): Promise<AIProviderResponse> {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": OPENROUTER_REFERER,
          "X-Title": "ProfileHub",
        },
        body: JSON.stringify({
          model: attemptedModel,
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

      logOpenRouter(response.ok ? "info" : "warn", response.ok ? "openrouter_http_success" : "openrouter_http_error", {
        AI_PROVIDER: requestedProvider,
        OPENROUTER_MODEL: configuredModel,
        OPENROUTER_ATTEMPTED_MODEL: attemptedModel,
        OPENROUTER_FALLBACK_MODELS: fallbackModels,
        OPENROUTER_API_KEY_exists: Boolean(apiKey),
        httpStatus: response.status,
        errorBody: response.ok ? undefined : safeLogString(payload),
      });

      if (!response.ok) {
        const parsed = parseErrorPayload(payload);
        const debugCode = getDebugCode(response.status, parsed.message, parsed.code);
        throw new OpenRouterProviderError(
          parsed.message,
          response.status,
          parsed.code,
          debugCode,
          true,
          [attemptedModel]
        );
      }

      const parsed = payload as OpenRouterResponse;
      const content = extractContent(parsed);

      if (!content) {
        throw new OpenRouterProviderError(
          "OpenRouter returned an empty response.",
          response.status,
          "empty_response",
          "openrouter_bad_request",
          true,
          [attemptedModel]
        );
      }

      return {
        content,
        text: content,
        provider: "openrouter",
        model: parsed.model || attemptedModel,
        tokensUsed: parsed.usage?.total_tokens || 0,
        fallback: false,
      };
}
