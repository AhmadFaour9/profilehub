export const PRODUCTION_APP_URL = "https://profilehub-two.vercel.app";

export function normalizeBaseUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

export function encodeProfileUsername(username: string): string {
  return encodeURIComponent(username.trim().replace(/^\/+/, ""));
}

export function buildProfileUrl(baseUrl: string, username: string): string {
  return new URL(`/${encodeProfileUsername(username)}`, normalizeBaseUrl(baseUrl) || PRODUCTION_APP_URL).toString();
}

export function getClientAppUrl(): string {
  const configuredUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (configuredUrl) return configuredUrl;

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return PRODUCTION_APP_URL;
}
