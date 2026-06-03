import { PRODUCTION_APP_URL, normalizeBaseUrl } from "@/lib/profile-url";

export function getAppUrl(): string {
  const configuredUrl = normalizeBaseUrl(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL);
  if (configuredUrl) return configuredUrl;

  if (process.env.NODE_ENV === "production") return PRODUCTION_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:24359";
}

export function getGatewayUrl(): string {
  return process.env.GATEWAY_URL || "http://localhost:4000";
}

export type SupabasePublicKeySource =
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "missing";

export type SupabasePublicConfig =
  | {
      ok: true;
      url: string;
      publicKey: string;
      keySource: Exclude<SupabasePublicKeySource, "missing">;
    }
  | {
      ok: false;
      error: "public_supabase_missing";
      url: string | null;
      publicKey: null;
      keySource: SupabasePublicKeySource;
    };

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export function getSupabasePublicKeySelection():
  | { key: string; source: Exclude<SupabasePublicKeySource, "missing"> }
  | { key: null; source: "missing" } {
  const publishableKey = readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (publishableKey) {
    return { key: publishableKey, source: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" };
  }

  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (anonKey) {
    return { key: anonKey, source: "NEXT_PUBLIC_SUPABASE_ANON_KEY" };
  }

  return { key: null, source: "missing" };
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publicKey = getSupabasePublicKeySelection();

  if (!url || !publicKey.key) {
    return {
      ok: false,
      error: "public_supabase_missing",
      url,
      publicKey: null,
      keySource: publicKey.source,
    };
  }

  return {
    ok: true,
    url,
    publicKey: publicKey.key,
    keySource: publicKey.source,
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig().ok;
}

export function getSupabasePublicEnv() {
  const config = getSupabasePublicConfig();

  if (!config.ok) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return {
    url: config.url,
    publicKey: config.publicKey,
    keySource: config.keySource,
    anonKey: config.publicKey,
  };
}
