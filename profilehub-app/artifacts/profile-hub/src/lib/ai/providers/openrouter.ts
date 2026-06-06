import { PRODUCTION_APP_URL } from "@/lib/profile-url";
import type { AIFeature } from "../prompts";
import { buildPrompt } from "../prompts";
import type { AIProvider, AIProviderResponse } from "./mock";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_REFERER = PRODUCTION_APP_URL;
const MAX_LOG_STRING_LENGTH = 800;
const DEFAULT_OPENROUTER_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
];
const DEFAULT_OPENROUTER_TIMEOUT_MS = 20_000;

export type OpenRouterDebugCode =
  | "openrouter_missing_key"
  | "openrouter_model_unavailable"
  | "openrouter_rate_limited"
  | "openrouter_quota_exceeded"
  | "openrouter_auth_failed"
  | "openrouter_timeout"
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

function splitModels(value: string): string[] {
  return value
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function configuredModels(): string[] {
  const configuredList = splitModels(readEnv("OPENROUTER_MODELS"));
  if (configuredList.length > 0) return uniqueValues(configuredList);

  const legacyModel = readEnv("OPENROUTER_MODEL");
  return uniqueValues([legacyModel, ...DEFAULT_OPENROUTER_MODELS]);
}

function configuredTimeoutMs(): number {
  const configured = Number(readEnv("OPENROUTER_TIMEOUT_MS"));
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_OPENROUTER_TIMEOUT_MS;
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

function shouldTryNextModel(error: OpenRouterProviderError): boolean {
  if (error.debugCode === "openrouter_auth_failed" || error.debugCode === "openrouter_missing_key") return false;
  if (error.debugCode === "openrouter_timeout") return true;
  if ([400, 402, 404, 408, 429, 500, 502, 503, 504].includes(error.status || 0)) return true;
  return ["openrouter_model_unavailable", "openrouter_rate_limited", "openrouter_quota_exceeded", "openrouter_bad_request"].includes(
    error.debugCode
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
  const models = configuredModels();
  const model = models[0] || "";
  const requestedProvider = readEnv("AI_PROVIDER") || "default";
  const timeoutMs = configuredTimeoutMs();

  return {
    name: "openrouter",
    model,
    isConfigured: () => Boolean(apiKey && models.length > 0),
    async generate(feature: AIFeature, input: Record<string, unknown>): Promise<AIProviderResponse> {
      logOpenRouter("info", "openrouter_request_started", {
        AI_PROVIDER: requestedProvider,
        OPENROUTER_MODELS: models,
        OPENROUTER_MODEL: readEnv("OPENROUTER_MODEL") || "missing",
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

      if (models.length === 0) {
        throw new OpenRouterProviderError(
          "OpenRouter models are missing.",
          undefined,
          "missing_model",
          "openrouter_model_unavailable",
          true,
          []
        );
      }

      let lastError: OpenRouterProviderError | null = null;
      const attemptedModels: string[] = [];

      for (let index = 0; index < models.length; index += 1) {
        const attemptedModel = models[index];
        attemptedModels.push(attemptedModel);
        try {
          const response = await requestOpenRouter({
            apiKey,
            requestedProvider,
            configuredModels: models,
            attemptedModel,
            timeoutMs,
            feature,
            input,
          });

          logOpenRouter("info", "openrouter_generation_success", {
            provider: "openrouter",
            attemptedModel,
            finalSelectedModel: response.model || attemptedModel,
            status: "success",
          });

          return {
            ...response,
            attemptedModels,
          };
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

          if (!shouldTryNextModel(providerError)) {
            throw new OpenRouterProviderError(
              providerError.message,
              providerError.status,
              providerError.code,
              providerError.debugCode,
              true,
              uniqueValues([...attemptedModels, ...(providerError.attemptedModels || [])])
            );
          }

          const nextModel = models[index + 1];
          if (!nextModel) break;

          logOpenRouter("warn", "openrouter_model_fallback_attempt", {
            provider: "openrouter",
            failedModel: attemptedModel,
            nextModel,
            status: "fallback",
            fallbackReason: providerError.debugCode,
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
        attemptedModels
      );
    },
  };
}

async function requestOpenRouter({
  apiKey,
  requestedProvider,
  configuredModels,
  attemptedModel,
  timeoutMs,
  feature,
  input,
}: {
  apiKey: string;
  requestedProvider: string;
  configuredModels: string[];
  attemptedModel: string;
  timeoutMs: number;
  feature: AIFeature;
  input: Record<string, unknown>;
}): Promise<AIProviderResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": OPENROUTER_REFERER,
        "X-Title": "ProfileHub",
      },
      signal: controller.signal,
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
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    const debugCode: OpenRouterDebugCode = isTimeout ? "openrouter_timeout" : "openrouter_bad_request";

    logOpenRouter("warn", "openrouter_http_error", {
      AI_PROVIDER: requestedProvider,
      OPENROUTER_MODELS: configuredModels,
      OPENROUTER_ATTEMPTED_MODEL: attemptedModel,
      OPENROUTER_API_KEY_exists: Boolean(apiKey),
      status: "error",
      fallbackReason: debugCode,
      httpStatus: isTimeout ? "timeout" : undefined,
      errorMessage: isTimeout ? `OpenRouter request timed out after ${timeoutMs}ms.` : error instanceof Error ? error.message : "OpenRouter request failed.",
    });

    throw new OpenRouterProviderError(
      isTimeout ? "OpenRouter request timed out." : error instanceof Error ? error.message : "OpenRouter request failed.",
      isTimeout ? 408 : undefined,
      isTimeout ? "timeout" : "request_failed",
      debugCode,
      true,
      [attemptedModel]
    );
  } finally {
    clearTimeout(timeout);
  }

  const payload = await readJsonOrText(response);

  logOpenRouter(response.ok ? "info" : "warn", response.ok ? "openrouter_http_success" : "openrouter_http_error", {
    AI_PROVIDER: requestedProvider,
    OPENROUTER_MODELS: configuredModels,
    OPENROUTER_ATTEMPTED_MODEL: attemptedModel,
    OPENROUTER_API_KEY_exists: Boolean(apiKey),
    status: response.ok ? "success" : "error",
    fallbackReason: response.ok ? undefined : getDebugCode(response.status, parseErrorPayload(payload).message, parseErrorPayload(payload).code),
    httpStatus: response.status,
    errorBody: response.ok ? undefined : safeLogString(payload),
  });

  if (!response.ok) {
    const parsed = parseErrorPayload(payload);
    const debugCode = getDebugCode(response.status, parsed.message, parsed.code);
    throw new OpenRouterProviderError(parsed.message, response.status, parsed.code, debugCode, true, [attemptedModel]);
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
