"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser, createSupabaseServerClient } from "@/modules/auth";
import { createProfileService } from "@/modules/profile";
import { createStoragePath, validateStorageFile, type StorageBucket } from "@/modules/storage";
import { log } from "@/modules/logging";
import { linkFormSchema, projectFormSchema, serviceFormSchema } from "@/modules/shared";

type ActionResult<T = unknown> = {
  ok: boolean;
  message?: string;
  data?: T;
};

const linkUpdateSchema = linkFormSchema.partial();
const projectUpdateSchema = projectFormSchema.partial();
const serviceUpdateSchema = serviceFormSchema.partial();

async function getServices() {
  const user = await getCurrentUser();
  if (!user) return null;

  const client = await createSupabaseServerClient();
  const profileService = createProfileService(client, user.id);
  const profile = await profileService.getMyProfile();

  if (!profile) return null;
  return { user, profile, profileService };
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

  const client = await createSupabaseServerClient();
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
