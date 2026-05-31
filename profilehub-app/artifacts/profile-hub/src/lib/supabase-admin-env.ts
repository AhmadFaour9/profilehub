import "server-only";

import { getSupabasePublicConfig } from "@/lib/env";

const ADMIN_KEY_SOURCES = ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export type ConcreteSupabaseAdminKeySource = (typeof ADMIN_KEY_SOURCES)[number];
export type SupabaseAdminKeySource = ConcreteSupabaseAdminKeySource | "missing";
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
      keySource: ConcreteSupabaseAdminKeySource;
      keyType: "sb_secret" | "jwt_service_role";
    }
  | {
      ok: false;
      error: "public_supabase_missing" | "service_role_missing" | "service_role_invalid";
      keySource: SupabaseAdminKeySource;
      keyType: SupabaseAdminKeyType;
    };

export type ValidSupabaseAdminConfig = Extract<SupabaseAdminConfig, { ok: true }>;

export type SupabaseAdminKeyDiagnostic = {
  keySource: ConcreteSupabaseAdminKeySource;
  keyType: SupabaseAdminKeyType;
  present: boolean;
  valid: boolean;
};

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export function getSupabaseAdminKeySelection():
  | { key: string; source: ConcreteSupabaseAdminKeySource }
  | { key: null; source: "missing" } {
  for (const source of ADMIN_KEY_SOURCES) {
    const key = readEnv(source);
    if (key) return { key, source };
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

export function getSupabaseAdminKeyDiagnostics(): SupabaseAdminKeyDiagnostic[] {
  return ADMIN_KEY_SOURCES.map((source) => {
    const key = readEnv(source);
    const keyType = getSupabaseAdminKeyType(key);

    return {
      keySource: source,
      keyType,
      present: Boolean(key),
      valid: keyType === "sb_secret" || keyType === "jwt_service_role",
    };
  });
}

export function getSupabaseAdminConfigs(): ValidSupabaseAdminConfig[] {
  const publicConfig = getSupabasePublicConfig();
  if (!publicConfig.ok) return [];

  const seenKeys = new Set<string>();
  return ADMIN_KEY_SOURCES.flatMap((source) => {
    const key = readEnv(source);
    if (!key || seenKeys.has(key)) return [];

    const keyType = getSupabaseAdminKeyType(key);
    if (keyType !== "sb_secret" && keyType !== "jwt_service_role") return [];

    seenKeys.add(key);
    return [
      {
        ok: true,
        url: publicConfig.url,
        adminKey: key,
        keySource: source,
        keyType,
      } satisfies ValidSupabaseAdminConfig,
    ];
  });
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

  const validConfigs = getSupabaseAdminConfigs();
  if (validConfigs[0]) return validConfigs[0];

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
