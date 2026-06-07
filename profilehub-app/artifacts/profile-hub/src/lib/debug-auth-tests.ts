import "server-only";

import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export type DebugSupabaseKeyType =
  | "sb_publishable"
  | "sb_secret"
  | "jwt_service_role"
  | "jwt_anon"
  | "jwt_other"
  | "unknown"
  | "missing";

type SafeSupabaseRestError = {
  code: string;
  message: string;
};

export type SupabaseKeyDebugInput = {
  supabaseUrl: string;
  keys: Array<{
    name: string;
    value: string;
  }>;
};

export type SupabaseKeyDebugResult = {
  name: string;
  maskedKey: string | null;
  type: DebugSupabaseKeyType;
  jwtRole: string | null;
  jwtRef: string | null;
  jwtExpExists: boolean;
  canReadProfiles: boolean;
  status: number | null;
  error: SafeSupabaseRestError | null;
};

type JwtMetadata = {
  role: string | null;
  ref: string | null;
  expExists: boolean;
};

export function isDebugAuthEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.ENABLE_DEBUG_AUTH_TESTS?.trim().toLowerCase() === "true" && Boolean(process.env.DEBUG_AUTH_TEST_SECRET);
}

export function isAuthorizedDebugRequest(request: NextRequest): boolean {
  if (!isDebugAuthEnabled()) return false;

  const expected = process.env.DEBUG_AUTH_TEST_SECRET;
  const actual = request.headers.get("x-debug-secret");
  if (!expected || !actual) return false;

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function maskKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 10) {
    return `${key.slice(0, 2)}...${key.slice(-2)}`;
  }

  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function decodeJwtPayload(key: string | null): Record<string, unknown> | null {
  if (!key) return null;

  const parts = key.split(".");
  if (parts.length !== 3 || !parts[1]) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getJwtMetadata(key: string | null): JwtMetadata {
  const payload = decodeJwtPayload(key);
  if (!payload) return { role: null, ref: null, expExists: false };

  return {
    role: typeof payload.role === "string" ? payload.role : null,
    ref: typeof payload.ref === "string" ? payload.ref : null,
    expExists: Object.hasOwn(payload, "exp"),
  };
}

function detectKeyType(key: string | null): DebugSupabaseKeyType {
  if (!key) return "missing";
  if (key.startsWith("sb_publishable_")) return "sb_publishable";
  if (key.startsWith("sb_secret_")) return "sb_secret";

  const payload = decodeJwtPayload(key);
  if (!payload) return "unknown";
  if (payload.role === "service_role") return "jwt_service_role";
  if (payload.role === "anon") return "jwt_anon";
  return "jwt_other";
}

function safeMessage(value: unknown): string {
  if (typeof value !== "string") return "Supabase REST request failed.";
  return value.replace(/\s+/g, " ").slice(0, 200);
}

async function parseRestError(response: Response): Promise<SafeSupabaseRestError> {
  const fallback = {
    code: `http_${response.status}`,
    message: response.statusText || "Supabase REST request failed.",
  };

  try {
    const body = await response.json();
    if (!body || typeof body !== "object") return fallback;

    const record = body as Record<string, unknown>;
    return {
      code: typeof record.code === "string" ? record.code : fallback.code,
      message: safeMessage(record.message || record.details || fallback.message),
    };
  } catch {
    return fallback;
  }
}

async function readProfiles(
  supabaseUrl: string,
  key: string
): Promise<{ canReadProfiles: boolean; status: number; error: SafeSupabaseRestError | null }> {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/profiles?select=id&limit=1`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });

  if (response.ok) {
    return {
      canReadProfiles: true,
      status: response.status,
      error: null,
    };
  }

  return {
    canReadProfiles: false,
    status: response.status,
    error: await parseRestError(response),
  };
}

async function testOneSupabaseKey(supabaseUrl: string, keyInput: SupabaseKeyDebugInput["keys"][number]): Promise<SupabaseKeyDebugResult> {
  const key = keyInput.value.trim();
  const jwt = getJwtMetadata(key);
  const baseResult: SupabaseKeyDebugResult = {
    name: keyInput.name,
    maskedKey: maskKey(key),
    type: detectKeyType(key),
    jwtRole: jwt.role,
    jwtRef: jwt.ref,
    jwtExpExists: jwt.expExists,
    canReadProfiles: false,
    status: null,
    error: null,
  };

  if (!key) {
    return {
      ...baseResult,
      maskedKey: null,
      type: "missing",
      error: {
        code: "missing",
        message: "Key value is empty.",
      },
    };
  }

  const readResult = await readProfiles(supabaseUrl, key);
  return {
    ...baseResult,
    canReadProfiles: readResult.canReadProfiles,
    status: readResult.status,
    error: readResult.error,
  };
}

export async function testSupabaseKeysReadOnly(input: SupabaseKeyDebugInput): Promise<SupabaseKeyDebugResult[]> {
  return Promise.all(input.keys.map((key) => testOneSupabaseKey(input.supabaseUrl, key)));
}
