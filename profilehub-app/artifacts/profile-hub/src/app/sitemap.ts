import type { MetadataRoute } from "next";
import { createSupabaseAdminClient } from "@/modules/auth";
import { getAppUrl } from "@/lib/env";
import { buildProfileUrl } from "@/lib/profile-url";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  const supabase = createSupabaseAdminClient();
  if (!supabase) return entries;

  const { data, error } = await supabase
    .from("profiles")
    .select("username,updated_at")
    .eq("is_published", true)
    .not("username", "is", null)
    .order("updated_at", { ascending: false })
    .limit(5000);

  if (error) return entries;

  return [
    ...entries,
    ...(data || []).map((profile) => ({
      url: buildProfileUrl(appUrl, String(profile.username)),
      lastModified: profile.updated_at ? new Date(profile.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
