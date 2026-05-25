import "server-only";

import { createHash } from "crypto";
import type { NextRequest } from "next/server";

const REDACTED_KEYS = ["password", "token", "secret", "key", "authorization", "cookie", "email", "ip", "user_agent"];

export function hashValue(value: string | null | undefined): string | null {
  if (!value) return null;

  const salt = process.env.LOG_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "profilehub-local";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function getRequestIp(request: NextRequest | Request): string | null {
  const headers = request.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip")
  );
}

export function getUserAgent(request: NextRequest | Request): string | null {
  return request.headers.get("user-agent");
}

export function safeMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safeMetadata);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      const lower = key.toLowerCase();
      if (REDACTED_KEYS.some((blocked) => lower.includes(blocked))) {
        return [key, "[redacted]"];
      }
      return [key, safeMetadata(entry)];
    })
  );
}

export function detectDevice(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (/mobile|iphone|android/i.test(userAgent)) return "mobile";
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  return "desktop";
}
