import "server-only";

import type { User } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/modules/auth";
import { createProfileService } from "@/modules/profile";
import { mockGallery, mockLinks, mockProjects, mockServices, mockUser } from "./mock-data";
import { isSupabaseConfigured } from "@/lib/env";
import {
  formatAdminDbError,
  isSupabasePermissionError,
  runSupabaseAdminOperation,
  type SupabaseDbError,
} from "@/lib/supabase-admin-resolver";
import type { Profile, PublicProfile } from "@/modules/shared";

function mapProfileRow(row: any): Profile {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    title: row.title,
    profession: row.title,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url,
    location: row.location,
    website: row.website,
    themeId: row.theme_id,
    isPublished: row.is_published,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    theme: row.theme ? { id: row.theme.id, ...row.theme.tokens } : { id: "default" },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function logProfileDbError(message: string, error: SupabaseDbError) {
  console.error(message, {
    code: error.code,
    message: error.message,
  });
}

function profileInsertErrorMessage(error: SupabaseDbError | null | undefined): string {
  if (!error) return "profile_insert_error:unknown";
  if (error.code === "23505") return "username_taken";
  if (error.code === "42P01") return "schema_mismatch";
  if (isSupabasePermissionError(error)) return formatAdminDbError(error);
  return `profile_insert_error:${error.code || "unknown"}`;
}

/**
 * Get the current user's profile, or create a default one if it doesn't exist.
 * Called after auth signup/login to ensure every user has a profile row.
 */
export async function getOrCreateProfile(user: User): Promise<Profile | null> {
  const existingProfile = await runSupabaseAdminOperation((admin) =>
    admin.from("profiles").select("*, theme:themes(*)").eq("user_id", user.id).maybeSingle()
  );

  if (!existingProfile.ok) {
    if (existingProfile.error !== "admin_db_error") throw new Error(existingProfile.error);
    if (existingProfile.dbError) logProfileDbError("Failed to look up default profile:", existingProfile.dbError);
    throw new Error(formatAdminDbError(existingProfile.dbError));
  }

  if (existingProfile.result.data) return mapProfileRow(existingProfile.result.data);

  // Build a safe username from auth metadata
  const rawName = user.user_metadata?.user_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "user";
  const slug = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const username = (slug.length >= 3 ? slug : "user" + slug).slice(0, 25) + Math.floor(Math.random() * 1000);
  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "New User";

  const createdProfile = await runSupabaseAdminOperation((admin) =>
    admin
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          username,
          display_name: displayName,
          is_published: false,
        },
        { onConflict: "user_id" }
      )
      .select("*, theme:themes(*)")
      .single()
  );

  if (!createdProfile.ok) {
    if (createdProfile.error !== "admin_db_error") throw new Error(createdProfile.error);
    if (createdProfile.dbError) logProfileDbError("Failed to create default profile:", createdProfile.dbError);
    throw new Error(profileInsertErrorMessage(createdProfile.dbError));
  }

  return mapProfileRow(createdProfile.result.data);
}

export async function getMyProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return mockUser;

  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const service = createProfileService(client, user.id);
  return service.getMyProfile();
}

export async function getMyProfileContent() {
  if (!isSupabaseConfigured()) {
    return { profile: mockUser, links: mockLinks, projects: mockProjects, services: mockServices, media: mockGallery };
  }

  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    return { profile: mockUser, links: mockLinks, projects: mockProjects, services: mockServices, media: mockGallery };
  }
  const service = createProfileService(client, user.id);
  const content = await service.getMyProfileContent();
  if (!content) {
    return { profile: mockUser, links: mockLinks, projects: mockProjects, services: mockServices, media: mockGallery };
  }
  return content;
}

export function getPublicProfileCached(username: string) {
  return unstable_cache(
    () => getPublicProfile(username),
    ["public-profile", username],
    { revalidate: 300, tags: [`profile:${username}`] }
  )();
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured()) {
    // Fallback to mock data for local dev without Supabase
    if (mockUser.username === username || username === "sara-dev") {
      return {
        ...mockUser,
        username,
        links: mockLinks,
        projects: mockProjects,
        services: mockServices,
        gallery: mockGallery,
      };
    }
    return null;
  }

  // Use admin client for public reads — RLS allows public SELECT on published profiles,
  // but admin client ensures we always get the data regardless of auth state.
  const profileLookup = await runSupabaseAdminOperation((admin) =>
    admin.from("profiles").select("*, theme:themes(*)").eq("username", username).maybeSingle()
  );

  if (!profileLookup.ok) {
    if (profileLookup.dbError) logProfileDbError("Failed to look up public profile:", profileLookup.dbError);
    return null;
  }

  const profile = profileLookup.result.data ? mapProfileRow(profileLookup.result.data) : null;
  if (!profile || !profile.isPublished) return null;

  const profileId = profile.id;
  const admin = profileLookup.client;

  // Fetch public relations (active only)
  const [links, projects, services, media] = await Promise.all([
    admin.from("links").select("*").eq("profile_id", profileId).eq("is_active", true).order("position"),
    admin.from("projects").select("*").eq("profile_id", profileId).eq("is_active", true).order("position"),
    admin.from("services").select("*").eq("profile_id", profileId).eq("is_active", true).order("position"),
    admin.from("media").select("*").eq("profile_id", profileId).order("position"),
  ]);

  return {
    ...profile,
    links: links.data || [],
    projects: projects.data || [],
    services: services.data || [],
    gallery: media.data || [],
  } as any;
}
