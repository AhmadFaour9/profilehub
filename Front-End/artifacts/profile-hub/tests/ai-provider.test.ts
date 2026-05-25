import { afterEach, describe, expect, it, vi } from "vitest";
import { minimizeInput } from "../src/lib/ai/prompts";
import { runAIForUser, selectProvider } from "../src/lib/ai/provider";

describe("AI provider fallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses mock provider when no AI key is configured", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");

    expect(selectProvider().name).toBe("mock");
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
