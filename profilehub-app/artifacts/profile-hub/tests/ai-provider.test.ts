import { afterEach, describe, expect, it, vi } from "vitest";
import { minimizeInput } from "../src/lib/ai/prompts";
import { runAIForUser, selectProvider } from "../src/lib/ai/provider";
import { createOpenRouterProvider } from "../src/lib/ai/providers/openrouter";

describe("AI provider fallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses mock provider when no AI key is configured", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("OPENROUTER_MODELS", "");
    vi.stubEnv("OPENROUTER_MODEL", "");

    expect(selectProvider().name).toBe("mock");
  });

  it("uses OpenRouter when requested and configured", () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_MODELS", "example/free-model,example/backup-model");

    const provider = selectProvider();

    expect(provider.name).toBe("openrouter");
    expect(provider.model).toBe("example/free-model");
  });

  it("supports legacy OPENROUTER_MODEL when OPENROUTER_MODELS is missing", () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_MODELS", "");
    vi.stubEnv("OPENROUTER_MODEL", "legacy/free-model");

    const provider = selectProvider();

    expect(provider.name).toBe("openrouter");
    expect(provider.model).toBe("legacy/free-model");
  });

  it("uses required OpenRouter headers and exposes a safe rate-limit debug code", async () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");
    vi.stubEnv("OPENROUTER_MODELS", "example/free-model");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Rate limit exceeded" } }), {
        status: 429,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createOpenRouterProvider();

    await expect(provider.generate("generate_bio", { displayName: "Sara" })).rejects.toMatchObject({
      debugCode: "openrouter_rate_limited",
      status: 429,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-openrouter-key",
          "Content-Type": "application/json",
          "HTTP-Referer": "https://profilehub-two.vercel.app",
          "X-Title": "ProfileHub",
        }),
      })
    );
  });

  it("tries an OpenRouter fallback model when the configured model is unavailable", async () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");
    vi.stubEnv("OPENROUTER_MODELS", "unavailable/model:free,google/gemma-4-26b-a4b-it:free");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "No endpoints found for model" } }), {
          status: 404,
          headers: { "content-type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "Fallback model response" } }], usage: { total_tokens: 12 } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createOpenRouterProvider();
    const response = await provider.generate("generate_bio", { displayName: "Sara" });

    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);

    expect(firstBody.model).toBe("unavailable/model:free");
    expect(secondBody.model).toBe("google/gemma-4-26b-a4b-it:free");
    expect(response.content).toBe("Fallback model response");
    expect(response.model).toBe("google/gemma-4-26b-a4b-it:free");
    expect(response.attemptedModels).toEqual(["unavailable/model:free", "google/gemma-4-26b-a4b-it:free"]);
  });

  it("tries the next OpenRouter model when quota is exceeded", async () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");
    vi.stubEnv("OPENROUTER_MODELS", "quota/model:free,backup/model:free");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Quota exceeded" } }), {
          status: 402,
          headers: { "content-type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "Backup response" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createOpenRouterProvider();
    const response = await provider.generate("generate_bio", { displayName: "Sara" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.content).toBe("Backup response");
    expect(response.attemptedModels).toEqual(["quota/model:free", "backup/model:free"]);
  });

  it("tries the next OpenRouter model after a timeout", async () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");
    vi.stubEnv("OPENROUTER_MODELS", "slow/model:free,backup/model:free");

    const timeoutError = Object.assign(new Error("Aborted"), { name: "AbortError" });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "Recovered response" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createOpenRouterProvider();
    const response = await provider.generate("generate_bio", { displayName: "Sara" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.content).toBe("Recovered response");
    expect(response.attemptedModels).toEqual(["slow/model:free", "backup/model:free"]);
  });

  it("does not forward sensitive fields into prompts", () => {
    const minimized = minimizeInput({
      displayName: "Sara",
      email: "private@example.com",
      password: "secret",
      links: [{ title: "Portfolio", url: "https://example.com", token: "hidden" }],
    });

    expect(JSON.stringify(minimized)).not.toContain("private@example.com");
    expect(JSON.stringify(minimized)).not.toContain("hidden");
  });

  it("returns a mock response without Supabase or AI env", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");

    const response = await runAIForUser("test-user", "generate_bio", {
      displayName: "Sara",
      title: "Designer",
    });

    expect(response.fallback).toBe(true);
    expect(response.text).toContain("Sara");
  });
});
