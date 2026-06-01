import "server-only";

import { headers } from "next/headers";
import { getAppUrl } from "@/lib/env";

export async function getRequestOrigin(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");

  if (host) return `${proto}://${host}`;
  return getAppUrl();
}

export function getProfileUrl(origin: string, username: string): string {
  return new URL(`/${username}`, origin).toString();
}
