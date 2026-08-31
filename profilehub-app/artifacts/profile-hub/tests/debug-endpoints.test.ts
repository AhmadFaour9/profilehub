import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

import { isAuthorizedDebugRequest, isDebugAuthEnabled } from "@/lib/debug-auth-tests";

/**
 * /api/debug/* and /test-auth report on Supabase keys and auth wiring. They are
 * developer tools and they must never answer in production, whatever is left
 * behind in the environment - an ENABLE_DEBUG_AUTH_TESTS=true that was set once
 * to diagnose a login problem should not still be a live endpoint months later.
 *
 * The refusal is two independent checks (NODE_ENV and VERCEL_ENV) because
 * either one alone has a way of being wrong: a self-hosted deployment may not
 * set VERCEL_ENV, and a preview build sets NODE_ENV=production while genuinely
 * being a preview.
 */

const SECRET = "a-long-enough-debug-secret";

/** Only the one method the gate actually calls. */
function requestWith(headers: Record<string, string>): NextRequest {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest;
}

function enableFully() {
  vi.stubEnv("ENABLE_DEBUG_AUTH_TESTS", "true");
  vi.stubEnv("DEBUG_AUTH_TEST_SECRET", SECRET);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("debug endpoints are closed in production", () => {
  it("refuses when NODE_ENV is production, however it is configured", () => {
    enableFully();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");

    expect(isDebugAuthEnabled()).toBe(false);
  });

  it("refuses when VERCEL_ENV is production", () => {
    enableFully();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "production");

    expect(isDebugAuthEnabled()).toBe(false);
  });

  it("refuses a production request that carries the correct secret", () => {
    enableFully();
    vi.stubEnv("NODE_ENV", "production");

    expect(isAuthorizedDebugRequest(requestWith({ "x-debug-secret": SECRET }))).toBe(false);
  });
});

describe("debug endpoints outside production", () => {
  it("stays closed unless the flag is set", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("ENABLE_DEBUG_AUTH_TESTS", "");
    vi.stubEnv("DEBUG_AUTH_TEST_SECRET", SECRET);

    expect(isDebugAuthEnabled()).toBe(false);
  });

  it("stays closed when the flag is set but no secret was chosen", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("ENABLE_DEBUG_AUTH_TESTS", "true");
    vi.stubEnv("DEBUG_AUTH_TEST_SECRET", "");

    expect(isDebugAuthEnabled()).toBe(false);
  });

  it("opens only when both are set", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    enableFully();

    expect(isDebugAuthEnabled()).toBe(true);
  });
});

describe("the debug secret", () => {
  function inDevelopment() {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    enableFully();
  }

  it("accepts the exact secret", () => {
    inDevelopment();
    expect(isAuthorizedDebugRequest(requestWith({ "x-debug-secret": SECRET }))).toBe(true);
  });

  it("rejects a missing header", () => {
    inDevelopment();
    expect(isAuthorizedDebugRequest(requestWith({}))).toBe(false);
  });

  it("rejects a wrong secret of the same length", () => {
    inDevelopment();
    const wrong = "b".repeat(SECRET.length);
    expect(wrong).toHaveLength(SECRET.length);
    expect(isAuthorizedDebugRequest(requestWith({ "x-debug-secret": wrong }))).toBe(false);
  });

  it("rejects a shorter secret without throwing", () => {
    // timingSafeEqual throws on a length mismatch; the length has to be
    // compared before it is reached.
    inDevelopment();
    expect(() =>
      isAuthorizedDebugRequest(requestWith({ "x-debug-secret": "short" }))
    ).not.toThrow();
    expect(isAuthorizedDebugRequest(requestWith({ "x-debug-secret": "short" }))).toBe(false);
  });

  it("rejects a prefix of the secret", () => {
    inDevelopment();
    expect(
      isAuthorizedDebugRequest(requestWith({ "x-debug-secret": SECRET.slice(0, -1) }))
    ).toBe(false);
  });
});
