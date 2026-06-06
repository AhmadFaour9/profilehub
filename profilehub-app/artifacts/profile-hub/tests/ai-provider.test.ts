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
    vi.stubEnv("OPENROUTER_MODEL", "");

    expect(selectProvider().name).toBe("mock");
  });

  it("uses OpenRouter when requested and configured", () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_MODEL", "example/free-model");

    const provider = selectProvider();

    expect(provider.name).toBe("openrouter");
    expect(provider.model).toBe("example/free-model");
  });

  it("uses required OpenRouter headers and exposes a safe rate-limit debug code", async () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");
    vi.stubEnv("OPENROUTER_MODEL", "example/free-model");

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
