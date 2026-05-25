import "server-only";

import type { User } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/modules/auth";
import { createProfileService } from "@/modules/profile";
import { mockGallery, mockLinks, mockProjects, mockServices, mockUser } from "./mock-data";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile, PublicProfile } from "@/modules/shared";

/**
 * Get the current user's profile, or create a default one if it doesn't exist.
 * Called after auth signup/login to ensure every user has a profile row.
 */
export async function getOrCreateProfile(user: User): Promise<Profile | null> {
  const client = await createSupabaseServerClient();
  const service = createProfileService(client, user.id);

  const profile = await service.getMyProfile();
  if (profile) return profile;

  // Build a safe username from auth metadata
  const rawName = user.user_metadata?.user_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "user";
  const slug = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const username = (slug.length >= 3 ? slug : "user" + slug).slice(0, 25) + Math.floor(Math.random() * 1000);
  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "New User";

  // Use admin client to insert so we bypass RLS (server-side only)
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("profiles")
    .insert({
      user_id: user.id,
      username,
      display_name: displayName,
      is_published: false,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create default profile:", error.message);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    username: data.username,
    displayName: data.display_name,
    title: data.title,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    coverUrl: data.cover_url,
    location: data.location,
    website: data.website,
    themeId: data.theme_id,
    isPublished: data.is_published,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as Profile;
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
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const service = createProfileService(admin);
  const profile = await service.getProfile(username);
  if (!profile || !profile.isPublished) return null;

  const profileId = profile.id;

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
