import "server-only";

import { getSupabasePublicConfig } from "@/lib/env";

export type SupabaseAdminKeySource = "SUPABASE_SECRET_KEY" | "SUPABASE_SERVICE_ROLE_KEY" | "missing";
export type SupabaseAdminKeyType =
  | "sb_secret"
  | "jwt_service_role"
  | "jwt_anon"
  | "sb_publishable"
  | "missing"
  | "unknown";

export type SupabaseAdminConfig =
  | {
      ok: true;
      url: string;
      adminKey: string;
      keySource: Exclude<SupabaseAdminKeySource, "missing">;
      keyType: "sb_secret" | "jwt_service_role";
    }
  | {
      ok: false;
      error: "public_supabase_missing" | "service_role_missing" | "service_role_invalid";
      keySource: SupabaseAdminKeySource;
      keyType: SupabaseAdminKeyType;
    };

export type ValidSupabaseAdminConfig = Extract<SupabaseAdminConfig, { ok: true }>;

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export function getSupabaseAdminKeySelection():
  | { key: string; source: Exclude<SupabaseAdminKeySource, "missing"> }
  | { key: null; source: "missing" } {
  const secretKey = readEnv("SUPABASE_SECRET_KEY");
  if (secretKey) {
    return { key: secretKey, source: "SUPABASE_SECRET_KEY" };
  }

  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey) {
    return { key: serviceRoleKey, source: "SUPABASE_SERVICE_ROLE_KEY" };
  }

  return { key: null, source: "missing" };
}

function decodeJwtPayload(key: string): Record<string, unknown> | null {
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

export function getSupabaseAdminKeyType(key: string | null): SupabaseAdminKeyType {
  if (!key) return "missing";
  if (key.startsWith("sb_secret_")) return "sb_secret";
  if (key.startsWith("sb_publishable_")) return "sb_publishable";

  const payload = decodeJwtPayload(key);
  if (!payload) return "unknown";
  if (payload.role === "service_role") return "jwt_service_role";
  if (payload.role === "anon") return "jwt_anon";
  return "unknown";
}

export function getSupabaseAdminConfig(): SupabaseAdminConfig {
  const selectedKey = getSupabaseAdminKeySelection();
  const keyType = getSupabaseAdminKeyType(selectedKey.key);
  const publicConfig = getSupabasePublicConfig();

  if (!publicConfig.ok) {
    return {
      ok: false,
      error: "public_supabase_missing",
      keySource: selectedKey.source,
      keyType,
    };
  }

  if (!selectedKey.key) {
    return {
      ok: false,
      error: "service_role_missing",
      keySource: selectedKey.source,
      keyType,
    };
  }

  if (keyType !== "sb_secret" && keyType !== "jwt_service_role") {
    return {
      ok: false,
      error: "service_role_invalid",
      keySource: selectedKey.source,
      keyType,
    };
  }

  return {
    ok: true,
    url: publicConfig.url,
    adminKey: selectedKey.key,
    keySource: selectedKey.source,
    keyType,
  };
}
