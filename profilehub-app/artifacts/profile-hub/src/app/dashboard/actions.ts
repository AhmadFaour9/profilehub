"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAuthenticatedUser } from "@/modules/auth";
import { getOrCreateProfile } from "@/lib/profile-data";
import { profileCacheTag } from "@/lib/profile-cache";
import { debugLog, measureServer } from "@/lib/perf";
import { createProfileService } from "@/modules/profile";
import { createStoragePath, validateStorageFile, type StorageBucket } from "@/modules/storage";
import { log } from "@/modules/logging";
import { z } from "zod";
import { linkFormSchema, projectFormSchema, serviceFormSchema, profileFormSchema, safeTextSchema, socialLinksFormSchema, skillFormSchema, skillGroupFormSchema } from "@/modules/shared";
import {
  SECTION_KEYS,
  parseSectionVisibility,
  serializeSectionVisibility,
  type SectionVisibility,
} from "@/lib/profile-visibility";

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

function hasRequiredProfileFields(profile: {
  username?: string;
  displayName?: string;
  title?: string;
  bio?: string;
}) {
  return Boolean(
    profile.username?.trim() &&
      profile.displayName?.trim() &&
      profile.title?.trim() &&
      profile.bio?.trim()
  );
}

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
    const onboardingCompleted = hasRequiredProfileFields({
      username: parsed.username,
      displayName: parsed.displayName,
      title: parsed.title || "",
      bio: parsed.bio || "",
    });
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
      onboardingCompleted,
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

export async function uploadGalleryImage(formData: FormData): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  let uploadedPath: string | null = null;

  try {
    const file = formData.get("file");
    const caption = safeTextSchema(160).parse(String(formData.get("caption") || ""));

    if (!(file instanceof File)) return { ok: false, message: "Missing file." };
    if (!file.type.startsWith("image/")) {
      return { ok: false, message: "Gallery currently supports image uploads only." };
    }

    const validationError = validateStorageFile("gallery-media", file);
    if (validationError) return { ok: false, message: validationError };

    const path = createStoragePath(ctx.user.id, file);
    uploadedPath = path;
    const { error: uploadError } = await ctx.client.storage
      .from("gallery-media")
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) {
      await log("warn", "storage", "Gallery upload failed", { reason: uploadError.message });
      return { ok: false, message: "The image could not be uploaded." };
    }

    const { data: publicUrl } = ctx.client.storage.from("gallery-media").getPublicUrl(path);
    const { data: latest } = await ctx.client
      .from("media")
      .select("position")
      .eq("profile_id", ctx.profile.id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const data = await ctx.profileService.addMedia(ctx.profile.id, {
      url: publicUrl.publicUrl,
      alt: caption,
      caption,
      type: "image",
      position: typeof latest?.position === "number" ? latest.position + 1 : 0,
    });

    revalidateProfile(ctx.profile.username, "/dashboard/gallery");
    return { ok: true, data };
  } catch (error) {
    if (uploadedPath) {
      await ctx.client.storage.from("gallery-media").remove([uploadedPath]);
    }
    return { ok: false, message: errorMessage(error) };
  }
}

export async function deleteGalleryItem(id: string): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  try {
    const { data: media } = await ctx.client
      .from("media")
      .select("url")
      .eq("id", id)
      .eq("profile_id", ctx.profile.id)
      .maybeSingle();

    await ctx.profileService.deleteMedia(id, ctx.profile.id);

    const storagePath = getStoragePathFromPublicUrl(media?.url || "", "gallery-media");
    if (storagePath) {
      await ctx.client.storage.from("gallery-media").remove([storagePath]);
    }

    revalidateProfile(ctx.profile.username, "/dashboard/gallery");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

/**
 * Writes selected resume fields onto the profile.
 *
 * Only the fields the user actually chose are sent, and each is re-validated
 * with the same schema the profile form uses - the values originate from a
 * language model, so they are treated as untrusted input.
 */
const resumeApplySchema = z.object({
  displayName: safeTextSchema(80).pipe(z.string().min(2)).optional(),
  profession: safeTextSchema(120).optional(),
  bio: safeTextSchema(500).optional(),
  location: safeTextSchema(120).optional(),
  website: z.string().trim().url().max(400).optional().or(z.literal("")),
});

export async function applyResumeFields(input: unknown): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  const parsed = resumeApplySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "Invalid resume fields." };
  }

  const updates: Record<string, string> = {};
  if (parsed.data.displayName) updates.displayName = parsed.data.displayName;
  if (parsed.data.profession) updates.title = parsed.data.profession;
  if (parsed.data.bio) updates.bio = parsed.data.bio;
  if (parsed.data.location) updates.location = parsed.data.location;
  if (parsed.data.website) updates.website = parsed.data.website;

  if (!Object.keys(updates).length) {
    return { ok: false, message: "Nothing to apply." };
  }

  try {
    const data = await ctx.profileService.updateProfile(ctx.profile.id, updates);
    revalidateProfile(ctx.profile.username, "/dashboard/profile");
    revalidatePath("/dashboard/resume");

    await log("info", "profile", "Resume fields applied", {
      profileId: ctx.profile.id,
      fields: Object.keys(updates),
    });

    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function updateSectionVisibility(input: unknown): Promise<ActionResult<SectionVisibility>> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  // Only known keys survive, and anything not explicitly false stays visible.
  const visibility = parseSectionVisibility(input);
  const payload = serializeSectionVisibility(visibility);

  try {
    const { error } = await ctx.client
      .from("profiles")
      .update({ section_visibility: payload })
      .eq("id", ctx.profile.id);

    if (error) return { ok: false, message: error.message };

    revalidateProfile(ctx.profile.username, "/dashboard/profile");
    await log("info", "profile", "Section visibility updated", {
      profileId: ctx.profile.id,
      hidden: SECTION_KEYS.filter((key) => payload[key] === false),
    });

    return { ok: true, data: visibility };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

// ── Skills ──────────────────────────────────────────────────────────────────

function toSkillRow(profileId: string, input: { category: string; name: string; level?: string; position?: number; isActive?: boolean }) {
  return {
    profile_id: profileId,
    category: input.category.trim(),
    name: input.name.trim(),
    level: input.level?.trim() || null,
    position: input.position ?? 0,
    is_active: input.isActive ?? true,
  };
}

export async function createSkill(input: unknown): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  const parsed = skillFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Invalid skill." };

  const { data, error } = await ctx.client
    .from("skills")
    .insert(toSkillRow(ctx.profile.id, parsed.data))
    .select()
    .single();

  if (error) {
    // The unique constraint is per (profile, category, name); a duplicate is a
    // user mistake, not a failure worth surfacing as an error.
    if (error.code === "23505") return { ok: false, message: "That skill is already in this category." };
    return { ok: false, message: error.message };
  }

  revalidateProfile(ctx.profile.username, "/dashboard/skills");
  return { ok: true, data };
}

/**
 * Adds a whole category at once from a comma-separated list, which is how
 * skills actually arrive - pasted from a CV rather than typed one at a time.
 * Existing entries are skipped rather than erroring the whole batch.
 */
export async function createSkillGroup(input: unknown): Promise<ActionResult<{ added: number; skipped: number }>> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  const parsed = skillGroupFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Invalid input." };

  const names = Array.from(
    new Set(
      parsed.data.names
        .split(/[,\n;]/)
        .map((name) => name.trim())
        .filter((name) => name.length > 0 && name.length <= 60)
    )
  );

  if (!names.length) return { ok: false, message: "Add at least one skill." };

  const { data: existing } = await ctx.client
    .from("skills")
    .select("position")
    .eq("profile_id", ctx.profile.id)
    .order("position", { ascending: false })
    .limit(1);

  let position = (existing?.[0]?.position ?? -1) + 1;

  const rows = names.map((name) =>
    toSkillRow(ctx.profile.id, { category: parsed.data.category, name, position: position++ })
  );

  const { data, error } = await ctx.client
    .from("skills")
    .upsert(rows, { onConflict: "profile_id,category,name", ignoreDuplicates: true })
    .select();

  if (error) return { ok: false, message: error.message };

  const added = data?.length ?? 0;
  revalidateProfile(ctx.profile.username, "/dashboard/skills");
  return { ok: true, data: { added, skipped: names.length - added } };
}

export async function updateSkill(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  const parsed = skillFormSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Invalid skill." };

  const payload: Record<string, unknown> = {};
  if (parsed.data.category !== undefined) payload.category = parsed.data.category.trim();
  if (parsed.data.name !== undefined) payload.name = parsed.data.name.trim();
  if (parsed.data.level !== undefined) payload.level = parsed.data.level.trim() || null;
  if (parsed.data.position !== undefined) payload.position = parsed.data.position;
  if (parsed.data.isActive !== undefined) payload.is_active = parsed.data.isActive;

  const { data, error } = await ctx.client
    .from("skills")
    .update(payload)
    .eq("id", id)
    .eq("profile_id", ctx.profile.id)
    .select()
    .single();

  if (error) return { ok: false, message: error.message };

  revalidateProfile(ctx.profile.username, "/dashboard/skills");
  return { ok: true, data };
}

export async function deleteSkill(id: string): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  const { error } = await ctx.client
    .from("skills")
    .delete()
    .eq("id", id)
    .eq("profile_id", ctx.profile.id);

  if (error) return { ok: false, message: error.message };

  revalidateProfile(ctx.profile.username, "/dashboard/skills");
  return { ok: true };
}

export async function deleteSkillCategory(category: string): Promise<ActionResult> {
  const ctx = await getServices();
  if (!ctx) return { ok: false, message: "Unauthorized." };

  const { error } = await ctx.client
    .from("skills")
    .delete()
    .eq("profile_id", ctx.profile.id)
    .eq("category", category);

  if (error) return { ok: false, message: error.message };

  revalidateProfile(ctx.profile.username, "/dashboard/skills");
  return { ok: true };
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
  // Must match the normalization in getPublicProfileCached, or a profile
  // visited under different casing keeps serving the pre-save version.
  revalidateTag(profileCacheTag(username), "max");
}

function getStoragePathFromPublicUrl(url: string, bucket: StorageBucket): string | null {
  if (!url) return null;
  const marker = `/object/public/${bucket}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  const path = url.slice(markerIndex + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Request failed.";
}
