"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAuthenticatedUser } from "@/modules/auth";
import { getOrCreateProfile } from "@/lib/profile-data";
import { debugLog, measureServer } from "@/lib/perf";
import { createProfileService } from "@/modules/profile";
import { createStoragePath, validateStorageFile, type StorageBucket } from "@/modules/storage";
import { log } from "@/modules/logging";
import { linkFormSchema, projectFormSchema, serviceFormSchema, profileFormSchema, socialLinksFormSchema } from "@/modules/shared";

type ActionResult<T = unknown> = {
  ok: boolean;
  message?: string;
  data?: T;
};

const linkUpdateSchema = linkFormSchema.partial();
const projectUpdateSchema = projectFormSchema.partial();
const serviceUpdateSchema = serviceFormSchema.partial();

const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  twitter: "X / Twitter",
  instagram: "Instagram",
  youtube: "YouTube",
  behance: "Behance",
  dribbble: "Dribbble",
  tiktok: "TikTok",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  email: "Email Contact",
};

const SOCIAL_PLATFORM_IDS = Object.keys(SOCIAL_PLATFORM_LABELS);

function normalizeSocialPlatform(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .trim();
}

async function syncProfileSocialLinks(
  client: SupabaseClient,
  profileId: string,
  socialLinks: Array<{ platform: string; url: string }>
) {
  const desired = new Map<string, string>();

  socialLinks.forEach((link) => {
    const platform = normalizeSocialPlatform(link.platform);
    const url = link.url?.trim() || "";
    if (SOCIAL_PLATFORM_LABELS[platform] && url) {
      desired.set(platform, url);
    }
  });

  const { data: existingRows, error } = await client
    .from("social_links")
    .select("id,platform,is_active")
    .eq("profile_id", profileId)
    .in("platform", SOCIAL_PLATFORM_IDS);

  if (error) throw new Error(error.message);

  const existingByPlatform = new Map<string, any[]>();
  (existingRows || []).forEach((row) => {
    const platform = normalizeSocialPlatform(row.platform);
    if (!SOCIAL_PLATFORM_LABELS[platform]) return;
    const rows = existingByPlatform.get(platform) || [];
    rows.push(row);
    existingByPlatform.set(platform, rows);
  });

  const writes = SOCIAL_PLATFORM_IDS.flatMap((platform, index) => {
    const url = desired.get(platform);
    const existing = existingByPlatform.get(platform) || [];
    const [primary, ...duplicates] = existing;

    if (url) {
      const payload = {
        profile_id: profileId,
        platform,
        title: SOCIAL_PLATFORM_LABELS[platform],
        url,
        sort_order: index,
        is_active: true,
      };

      return [
        primary
          ? client.from("social_links").update(payload).eq("id", primary.id).eq("profile_id", profileId)
          : client.from("social_links").upsert(payload, { onConflict: "profile_id,platform" }),
        ...duplicates.map((row) => client.from("social_links").update({ is_active: false }).eq("id", row.id).eq("profile_id", profileId)),
      ];
    }

    return existing
      .filter((row) => row.is_active)
      .map((row) => client.from("social_links").update({ is_active: false }).eq("id", row.id).eq("profile_id", profileId));
  });

  const results = await Promise.all(writes);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}

async function getServices() {
  const { supabase: client, user } = await getAuthenticatedUser("server_action");
  if (!user) {
    console.warn("[AUTH] server_action_user_missing");
    return null;
  }

  debugLog("AUTH", "server_action_user_id", { user_id: user.id });

  const profileService = createProfileService(client, user.id);
  let profile;
  try {
    profile = await measureServer("server_action_profile_query", () =>
      getOrCreateProfile(user, { source: "dashboard", authClient: client })
    );
  } catch (error: any) {
    console.error("[DASHBOARD_ACTION] profile_load_failed", {
      auth_user_id: user.id,
      error: error?.message || error,
    });
    return null;
  }

  if (!profile) return null;
  return { client, user, profile, profileService };
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) {
    console.error("[PROFILE] profile_update_session_missing");
    return { ok: false, message: "You must be logged in." };
  }

  debugLog("PROFILE", "profile_update_user_id", { userId: ctx.user.id });
  debugLog("PROFILE", "profile_update_profile_id", { profileId: ctx.profile.id });

  try {
    const parsed = profileFormSchema.parse(input);
    const data = await ctx.profileService.updateProfile(ctx.profile.id, {
      username: parsed.username,
      displayName: parsed.displayName,
      title: parsed.title || "",
      bio: parsed.bio || "",
      location: parsed.location || "",
      website: parsed.website || "",
      seoTitle: parsed.seoTitle || "",
      seoDescription: parsed.seoDescription || "",
      isPublished: parsed.isPublished ?? ctx.profile.isPublished,
      avatarUrl: parsed.avatarUrl || "",
      coverUrl: parsed.coverUrl || "",
    });

    revalidateProfile(ctx.profile.username, "/dashboard/profile");
    if (parsed.username !== ctx.profile.username) {
      revalidateProfile(parsed.username, "/dashboard/profile");
    }
    
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function saveSocialLinks(input: unknown): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  try {
    const parsed = socialLinksFormSchema.parse(input);
    await syncProfileSocialLinks(
      ctx.client,
      ctx.profile.id,
      parsed.map((link) => ({ platform: link.platform, url: link.url || "" }))
    );
    revalidateProfile(ctx.profile.username, "/dashboard/links");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function createLink(input: unknown): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  try {
    const parsed = linkFormSchema.parse(input);
    const data = await ctx.profileService.createLink(ctx.profile.id, parsed);
    revalidateProfile(ctx.profile.username, "/dashboard/links");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function updateLink(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  try {
    const parsed = linkUpdateSchema.parse(input);
    const data = await ctx.profileService.updateLink(id, ctx.profile.id, parsed);
    revalidateProfile(ctx.profile.username, "/dashboard/links");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function deleteLink(id: string): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  try {
    await ctx.profileService.deleteLink(id, ctx.profile.id);
    revalidateProfile(ctx.profile.username, "/dashboard/links");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function createProject(input: unknown): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  try {
    const parsed = projectFormSchema.parse(input);
    const data = await ctx.profileService.createProject(ctx.profile.id, parsed);
    revalidateProfile(ctx.profile.username, "/dashboard/projects");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function updateProject(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  try {
    const parsed = projectUpdateSchema.parse(input);
    const data = await ctx.profileService.updateProject(id, ctx.profile.id, parsed);
    revalidateProfile(ctx.profile.username, "/dashboard/projects");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  try {
    await ctx.profileService.deleteProject(id, ctx.profile.id);
    revalidateProfile(ctx.profile.username, "/dashboard/projects");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function createService(input: unknown): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  try {
    const parsed = serviceFormSchema.parse(input);
    const data = await ctx.profileService.createService(ctx.profile.id, parsed);
    revalidateProfile(ctx.profile.username, "/dashboard/services");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function updateService(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  try {
    const parsed = serviceUpdateSchema.parse(input);
    const data = await ctx.profileService.updateService(id, ctx.profile.id, parsed);
    revalidateProfile(ctx.profile.username, "/dashboard/services");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function deleteService(id: string): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  try {
    await ctx.profileService.deleteService(id, ctx.profile.id);
    revalidateProfile(ctx.profile.username, "/dashboard/services");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function updateTheme(tokens: Record<string, unknown>): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  try {
    const data = await ctx.profileService.updateTheme(ctx.profile.id, tokens);
    revalidateProfile(ctx.profile.username, "/dashboard/theme");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function uploadProfileImage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  const bucket = String(formData.get("bucket") || "") as StorageBucket;
  const field = String(formData.get("field") || "");
  const file = formData.get("file");

  if (!(file instanceof File)) return { ok: false, message: "Missing file." };
  if (!["avatars", "covers", "project-media", "gallery-media"].includes(bucket)) {
    return { ok: false, message: "Invalid bucket." };
  }

  const validationError = validateStorageFile(bucket, file);
  if (validationError) return { ok: false, message: validationError };

  const client = ctx.client;
  const path = createStoragePath(ctx.user.id, file);
  const { error } = await client.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });

  if (error) {
    await log("warn", "storage", "Storage upload failed", { reason: error.message });
    return { ok: false, message: "The file could not be uploaded." };
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);

  try {
    if (field === "avatar_url") {
      await ctx.profileService.updateProfile(ctx.profile.id, { avatarUrl: data.publicUrl });
    } else if (field === "cover_url") {
      await ctx.profileService.updateProfile(ctx.profile.id, { coverUrl: data.publicUrl });
    }

    revalidateProfile(ctx.profile.username, "/dashboard/profile");
    return { ok: true, data: { url: data.publicUrl } };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

function revalidateProfile(username: string, dashboardPath: string) {
  revalidatePath(dashboardPath);
  revalidatePath(`/${username}`);
  revalidateTag(`profile:${username}`, "max");
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Request failed.";
}
