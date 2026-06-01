import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
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
import { usernameSchema, type Profile, type PublicProfile } from "@/modules/shared";

type ProfileEnsureSource = "signup" | "login" | "auth_callback" | "dashboard" | "onboarding" | "profile_update";

type ProfileEnsureOptions = {
  username?: string;
  displayName?: string;
  source?: ProfileEnsureSource;
  authClient?: SupabaseClient;
};

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
    socialLinks: row.social_links || [],
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

function logProfileLookupFailed(userId: string, source: ProfileEnsureSource, error: SupabaseDbError | null | undefined) {
  console.warn("[PROFILE] profile_lookup_failed", {
    auth_user_id: userId,
    source,
    code: error?.code,
    message: error?.message,
  });
}

function logProfileCreated(userId: string, profileId: string | undefined, source: ProfileEnsureSource) {
  if (source === "signup") {
    console.info("[PROFILE] profile_created_after_signup", {
      auth_user_id: userId,
      profile_id: profileId,
    });
    return;
  }

  console.info("[PROFILE] profile_auto_created_on_dashboard", {
    auth_user_id: userId,
    profile_id: profileId,
    source,
  });
}

function profileInsertErrorMessage(error: SupabaseDbError | null | undefined): string {
  if (!error) return "profile_insert_error:unknown";
  if (error.code === "23505") return "username_taken";
  if (error.code === "42P01") return "schema_mismatch";
  if (isSupabasePermissionError(error)) return formatAdminDbError(error);
  return `profile_insert_error:${error.code || "unknown"}`;
}

function buildProfileDefaults(user: User, options: ProfileEnsureOptions) {
  const metadata = user.user_metadata || {};
  const metadataUsername =
    typeof metadata.username === "string"
      ? metadata.username
      : typeof metadata.user_name === "string"
        ? metadata.user_name
        : typeof metadata.full_name === "string"
          ? metadata.full_name
          : "";
  const emailName = user.email?.split("@")[0] || "";
  const rawUsername = options.username || metadataUsername || emailName || "user";
  const slug = rawUsername
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 25);
  const baseUsername = slug.length >= 3 ? slug : `user${slug}`;
  const parsedUsername = usernameSchema.safeParse(baseUsername);
  const username = parsedUsername.success ? parsedUsername.data : `user${Math.floor(100000 + Math.random() * 900000)}`;
  const displayName =
    options.displayName ||
    (typeof metadata.full_name === "string" ? metadata.full_name : "") ||
    user.email?.split("@")[0] ||
    username;

  return { username, displayName };
}

async function upsertProfileForUser(user: User, username: string, displayName: string) {
  return runSupabaseAdminOperation((admin) =>
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
      .select("*")
      .single()
  );
}

async function upsertProfileForUserWithAuthClient(
  client: SupabaseClient,
  user: User,
  username: string,
  displayName: string
) {
  return client
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
    .select("*")
    .single();
}

async function getOrCreateProfileWithAuthClient(
  client: SupabaseClient,
  user: User,
  options: ProfileEnsureOptions
): Promise<Profile | null> {
  const source = options.source || "dashboard";
  const existingProfile = await client.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

  if (existingProfile.error) {
    logProfileLookupFailed(user.id, source, existingProfile.error);
    throw new Error(formatAdminDbError(existingProfile.error));
  }

  if (existingProfile.data) {
    console.info("[PROFILE] profile_lookup_success", { auth_user_id: user.id, source: `${source}:auth_client` });
    return mapProfileRow(existingProfile.data);
  }

  const defaults = buildProfileDefaults(user, options);
  let createdProfile = await upsertProfileForUserWithAuthClient(client, user, defaults.username, defaults.displayName);

  if (createdProfile.error?.code === "23505" && !options.username) {
    createdProfile = await upsertProfileForUserWithAuthClient(
      client,
      user,
      `user${Math.floor(100000 + Math.random() * 900000)}`,
      defaults.displayName
    );
  }

  if (createdProfile.error) {
    logProfileDbError("Failed to create default profile with auth client:", createdProfile.error);
    throw new Error(profileInsertErrorMessage(createdProfile.error));
  }

  const profile = mapProfileRow(createdProfile.data);
  logProfileCreated(user.id, profile.id, source);
  return profile;
}

/**
 * Get the current user's profile, or create a default one if it doesn't exist.
 * Called after auth signup/login to ensure every user has a profile row.
 */
export async function getOrCreateProfile(user: User, options: ProfileEnsureOptions = {}): Promise<Profile | null> {
  const source = options.source || "dashboard";

  if (options.authClient) {
    try {
      return await getOrCreateProfileWithAuthClient(options.authClient, user, options);
    } catch (error: any) {
      console.warn("[PROFILE] auth_client_profile_ensure_failed_using_admin_fallback", {
        auth_user_id: user.id,
        source,
        error: error?.message || error,
      });
    }
  }

  console.info("[PROFILE] profile_query_without_theme_embed", { auth_user_id: user.id });
  const existingProfile = await runSupabaseAdminOperation((admin) =>
    admin.from("profiles").select("*").eq("user_id", user.id).maybeSingle()
  );

  if (!existingProfile.ok) {
    if (existingProfile.error !== "admin_db_error") throw new Error(existingProfile.error);
    logProfileLookupFailed(user.id, source, existingProfile.dbError);
    throw new Error(formatAdminDbError(existingProfile.dbError));
  }

  if (existingProfile.result.data) {
    console.info("[PROFILE] profile_lookup_success", { auth_user_id: user.id });
    return mapProfileRow(existingProfile.result.data);
  }

  const defaults = buildProfileDefaults(user, options);
  let createdProfile = await upsertProfileForUser(user, defaults.username, defaults.displayName);

  if (!createdProfile.ok && createdProfile.error === "admin_db_error" && createdProfile.dbError?.code === "23505" && !options.username) {
    createdProfile = await upsertProfileForUser(
      user,
      `user${Math.floor(100000 + Math.random() * 900000)}`,
      defaults.displayName
    );
  }

  if (!createdProfile.ok) {
    if (createdProfile.error !== "admin_db_error") throw new Error(createdProfile.error);
    if (createdProfile.dbError) logProfileDbError("Failed to create default profile:", createdProfile.dbError);
    throw new Error(profileInsertErrorMessage(createdProfile.dbError));
  }

  const profile = mapProfileRow(createdProfile.result.data);
  logProfileCreated(user.id, profile.id, source);
  return profile;
}

export async function getMyProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;

  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  return getOrCreateProfile(user, { source: "dashboard", authClient: client });
}

export async function getMyProfileContent() {
  console.info("[DASHBOARD] dashboard_load_started");
  
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const client = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (!user) {
      console.warn("[DASHBOARD] getUser returned null", { authError });
      return null;
    }
    
    console.info("[DASHBOARD] dashboard_session_user_id", { dashboard_session_user_id: user.id });
    
    const profile = await getOrCreateProfile(user, { source: "dashboard", authClient: client });
    if (!profile) {
      console.info("[DASHBOARD] dashboard_profile_auto_created_failed");
      return null;
    }
    console.info("[DASHBOARD] dashboard_profile_loaded", { 
      dashboard_current_user_id: user.id,
      dashboard_profile_id: profile.id,
      dashboard_using_demo_data: false
    });

    const emptyContent = { profile, links: [], projects: [], services: [], media: [] };

    let contentLookup;
    try {
      contentLookup = await runSupabaseAdminOperation(async (admin) => {
        const service = createProfileService(admin, user.id);
        const data = await service.getMyProfileContent();
        return { data, error: null };
      });
    } catch (error: any) {
      console.error("[DASHBOARD] dashboard_content_load_failed", {
        error: error?.message || error,
      });
      return emptyContent;
    }

    if (!contentLookup.ok) {
      console.error("[DASHBOARD] dashboard_content_admin_load_failed", {
        error: contentLookup.error,
        code: contentLookup.dbError?.code,
        message: contentLookup.dbError?.message,
      });
      return emptyContent;
    }

    return contentLookup.result.data || emptyContent;
  } catch (error: any) {
    console.error("[DASHBOARD] dashboard_load_failed", { error: error?.message || error });
    return null;
  }
}

export function getPublicProfileCached(username: string) {
  return unstable_cache(
    () => getPublicProfile(username),
    ["public-profile", username],
    { revalidate: 300, tags: [`profile:${username}`] }
  )();
}

type PublicProfileOptions = {
  includeUnpublishedForUserId?: string;
};

export async function getPublicProfile(username: string, options: PublicProfileOptions = {}): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  // Use admin client for public reads — RLS allows public SELECT on published profiles,
  // but admin client ensures we always get the data regardless of auth state.
  const profileLookup = await runSupabaseAdminOperation((admin) =>
    admin.from("profiles").select("*").ilike("username", username).maybeSingle()
  );

  if (!profileLookup.ok) {
    if (profileLookup.dbError) logProfileDbError("Failed to look up public profile:", profileLookup.dbError);
    return null;
  }

  const profile = profileLookup.result.data ? mapProfileRow(profileLookup.result.data) : null;
  const canViewUnpublished =
    Boolean(options.includeUnpublishedForUserId) && profile?.userId === options.includeUnpublishedForUserId;
  if (!profile || (!profile.isPublished && !canViewUnpublished)) return null;

  const profileId = profile.id;
  const admin = profileLookup.client;

  // Fetch public relations (active only)
  const [links, projects, services, media, themeRes] = await Promise.all([
    admin.from("links").select("*").eq("profile_id", profileId).eq("is_active", true).order("position"),
    admin.from("projects").select("*").eq("profile_id", profileId).eq("is_active", true).order("position"),
    admin.from("services").select("*").eq("profile_id", profileId).eq("is_active", true).order("position"),
    admin.from("media").select("*").eq("profile_id", profileId).order("position"),
    profile.themeId ? admin.from("themes").select("*").eq("id", profile.themeId).maybeSingle() : Promise.resolve({ data: null })
  ]);

  if (themeRes.data) {
    profile.theme = { id: themeRes.data.id, ...(themeRes.data.tokens || {}) };
  }

  return {
    ...profile,
    links: links.data || [],
    projects: projects.data || [],
    services: services.data || [],
    gallery: media.data || [],
  } as any;
}
