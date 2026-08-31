import type { MetadataRoute } from "next";
import { createSupabaseAdminClient } from "@/modules/auth";
import { getAppUrl } from "@/lib/env";
import { buildProfileUrl } from "@/lib/profile-url";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const entries: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      priority: 1,
    },
  ];

  const supabase = createSupabaseAdminClient();
  if (!supabase) return entries;

  const { data, error } = await supabase
    .from("profiles")
    .select("username,updated_at,avatar_url,cover_url")
    .eq("is_published", true)
    .not("username", "is", null)
    .order("updated_at", { ascending: false })
    // The sitemap protocol permits up to 50,000 URLs in one sitemap. If this
    // marketplace exceeds that, split it with generateSitemaps instead of
    // silently omitting profiles.
    .limit(50_000);

  if (error) return entries;

  return [
    ...entries,
    ...(data || []).map((profile) => ({
      url: buildProfileUrl(appUrl, String(profile.username)),
      lastModified: toValidDate(profile.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: [profile.avatar_url, profile.cover_url].flatMap((value) => {
        const url = toHttpUrl(value);
        return url ? [url] : [];
      }),
    })),
  ];
}

function toValidDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
