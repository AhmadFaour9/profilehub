import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getDashboardAuthenticatedUser } from "@/modules/auth";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/env";
import { debugLog, measureServer } from "@/lib/perf";
import {
  formatAdminDbError,
  isSupabasePermissionError,
  runSupabaseAdminOperation,
  type SupabaseDbError,
} from "@/lib/supabase-admin-resolver";
import {
  usernameSchema,
  type GalleryItem,
  type Link,
  type Profile,
  type Project,
  type PublicProfile,
  type Service,
  type SocialLink,
} from "@/modules/shared";

type ProfileEnsureSource = "signup" | "login" | "oauth" | "auth_callback" | "dashboard" | "onboarding" | "profile_update";

type ProfileEnsureOptions = {
  username?: string;
  displayName?: string;
  source?: ProfileEnsureSource;
  authClient?: SupabaseClient;
  allowFallbackProfile?: boolean;
};

type ProfileContent = {
  profile: Profile;
  links: Link[];
  projects: Project[];
  services: Service[];
  media: GalleryItem[];
};

type RelationQueryResult<T = any> = {
  data: T[] | null;
  error: SupabaseDbError | null;
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
    onboardingCompleted: typeof row.onboarding_completed === "boolean" ? row.onboarding_completed : null,
    socialLinks: [],
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    theme: row.theme ? { id: row.theme.id, ...row.theme.tokens } : { id: "default" },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function getMissingProfileFields(row: any): string[] {
  return [
    ["username", row.username],
    ["display_name", row.display_name],
    ["title", row.title],
    ["bio", row.bio],
  ]
    .filter(([, value]) => !hasText(value))
    .map(([field]) => String(field));
}

function isProfileRowComplete(row: any): boolean {
  return getMissingProfileFields(row).length === 0;
}

function isMissingOnboardingColumnError(error: SupabaseDbError | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || "";
  return Boolean(
    error &&
      (error.code === "42703" ||
        error.code === "PGRST204" ||
        message.includes("onboarding_completed") ||
        message.includes("schema cache"))
  );
}

function mapLinkRow(row: any): Link {
  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    url: row.url,
    description: row.description,
    icon: row.icon,
    thumbnailUrl: row.image_url,
    imageUrl: row.image_url,
    category: row.category,
    type: row.category,
    position: row.sort_order,
    order: row.sort_order,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    clickCount: row.click_count || 0,
    lastClickedAt: row.last_clicked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSocialLinkRow(row: any): SocialLink {
  return {
    id: row.id,
    platform: row.platform,
    title: row.title,
    url: row.url,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function mapProjectRow(row: any): Project {
  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    projectUrl: row.project_url,
    repoUrl: row.repo_url,
    url: row.project_url || row.repo_url,
    tags: row.tags || [],
    position: row.position ?? row.sort_order ?? 0,
    order: row.position ?? row.sort_order ?? 0,
    isFeatured: row.is_featured,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapServiceRow(row: any): Service {
  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    description: row.description,
    priceLabel: row.price_label,
    price: row.price_label,
    duration: row.duration,
    icon: row.icon,
    imageUrl: row.image_url,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    position: row.sort_order ?? row.position,
    order: row.sort_order ?? row.position,
    sortOrder: row.sort_order ?? row.position,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMediaRow(row: any): GalleryItem {
  return {
    id: row.id,
    profileId: row.profile_id,
    url: row.url,
    imageUrl: row.url,
    alt: row.alt,
    caption: row.alt,
    type: row.type,
    position: row.position,
    order: row.position,
    createdAt: row.created_at,
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
    debugLog("PROFILE", "profile_created_after_signup", {
      auth_user_id: userId,
      profile_id: profileId,
    });
    return;
  }

  debugLog("PROFILE", "profile_auto_created_on_dashboard", {
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

function metadataString(user: User, keys: string[]): string {
  const metadata = user.user_metadata || {};
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function createUsernameCandidate(rawValue: string): string {
  const slug = rawValue
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/_+/g, "_")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 28);
  const baseUsername = slug.length >= 3 ? slug : `user${slug}`;
  const parsedUsername = usernameSchema.safeParse(baseUsername);

  return parsedUsername.success ? parsedUsername.data : `user${Math.floor(100000 + Math.random() * 900000)}`;
}

function buildProfileDefaults(user: User, options: ProfileEnsureOptions) {
  const metadataUsername =
    metadataString(user, ["username", "user_name", "preferred_username", "nickname"]) ||
    metadataString(user, ["full_name", "name", "display_name"]);
  const fullName = metadataString(user, ["full_name", "name", "display_name"]);
  const emailName = user.email?.split("@")[0] || "";
  const rawUsername = options.username || metadataUsername || emailName || "user";
  const username = createUsernameCandidate(rawUsername);
  const displayName =
    options.displayName ||
    fullName ||
    user.email?.split("@")[0] ||
    username;
  const avatarUrl = metadataString(user, ["avatar_url", "picture"]) || null;

  return { username, displayName, avatarUrl };
}

function createSupabasePublicReadClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const { url, publicKey } = getSupabasePublicEnv();

  return createClient(url, publicKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function buildFallbackProfileFromUser(user: User, options: ProfileEnsureOptions = {}): Profile {
  const defaults = buildProfileDefaults(user, options);
  const now = new Date().toISOString();

  return {
    id: user.id,
    userId: user.id,
    username: defaults.username,
    displayName: defaults.displayName,
    title: null,
    profession: null,
    bio: null,
    avatarUrl: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    coverUrl: null,
    location: null,
    website: null,
    themeId: null,
    theme: { id: "default" },
    socialLinks: [],
    isPublished: false,
    seoTitle: null,
    seoDescription: null,
    onboardingCompleted: false,
    createdAt: user.created_at || now,
    updatedAt: now,
  };
}

function emptyProfileContent(profile: Profile): ProfileContent {
  return { profile, links: [], projects: [], services: [], media: [] };
}

function isMissingColumnError(error: SupabaseDbError | null | undefined, column: string): boolean {
  const message = error?.message?.toLowerCase() || "";
  return Boolean(error && (error.code === "42703" || message.includes(`'${column}'`) || message.includes(`"${column}"`)));
}

async function queryProjectsForProfile(client: SupabaseClient, profileId: string): Promise<RelationQueryResult> {
  const orderedByPosition = await client
    .from("projects")
    .select("*")
    .eq("profile_id", profileId)
    .order("position");

  if (!isMissingColumnError(orderedByPosition.error, "position")) {
    return orderedByPosition as RelationQueryResult;
  }

  console.warn("[DASHBOARD] dashboard_projects_position_order_failed_retrying_created_at", {
    profile_id: profileId,
    code: orderedByPosition.error?.code,
    message: orderedByPosition.error?.message,
  });

  return client
    .from("projects")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at") as PromiseLike<RelationQueryResult>;
}

async function queryProjectsForProfileWithAdmin(profileId: string): Promise<RelationQueryResult | null> {
  const result = await runSupabaseAdminOperation(async (admin) => {
    const projects = await queryProjectsForProfile(admin, profileId);
    return { data: projects.data, error: projects.error };
  });

  if (!result.ok) {
    console.error("[DASHBOARD] dashboard_projects_admin_verify_failed", {
      profile_id: profileId,
      error: result.error,
      code: result.dbError?.code,
      message: result.dbError?.message,
    });
    return null;
  }

  return result.result;
}

async function resolveDashboardProjects(
  authProjects: RelationQueryResult,
  profileId: string
): Promise<any[]> {
  if (authProjects.error) {
    console.error("[DASHBOARD] dashboard_projects_query_failed", {
      profile_id: profileId,
      code: authProjects.error.code,
      message: authProjects.error.message,
    });

    const adminProjects = await queryProjectsForProfileWithAdmin(profileId);
    if (adminProjects?.error) {
      console.error("[DASHBOARD] dashboard_projects_admin_query_failed", {
        profile_id: profileId,
        code: adminProjects.error.code,
        message: adminProjects.error.message,
      });
      return [];
    }

    const rows = adminProjects?.data || [];
    console.warn("[DASHBOARD] dashboard_projects_loaded_with_admin_fallback", {
      profile_id: profileId,
      count: rows.length,
    });
    return rows;
  }

  const rows = authProjects.data || [];
  debugLog("DASHBOARD", "dashboard_projects_query_success", {
    profile_id: profileId,
    count: rows.length,
  });

  if (rows.length > 0) return rows;

  const adminProjects = await queryProjectsForProfileWithAdmin(profileId);
  if (adminProjects?.error) return rows;

  const adminRows = adminProjects?.data || [];
  debugLog("DASHBOARD", "dashboard_projects_admin_verify_count", {
    profile_id: profileId,
    count: adminRows.length,
  });

  if (adminRows.length > 0) {
    console.warn("[DASHBOARD] dashboard_projects_auth_returned_empty_admin_found_rows", {
      profile_id: profileId,
      count: adminRows.length,
    });
    return adminRows;
  }

  return rows;
}

async function ensureProfilePublished(client: SupabaseClient, profile: Profile): Promise<Profile> {
  if (profile.isPublished) return profile;

  const { data, error } = await client
    .from("profiles")
    .update({ is_published: true })
    .eq("id", profile.id)
    .select("*")
    .single();

  if (error || !data) {
    console.warn("[PROFILE] profile_auto_publish_failed", {
      profile_id: profile.id,
      code: error?.code,
      message: error?.message,
    });
    return profile;
  }

  return mapProfileRow(data);
}

async function loadProfileContentFromClient(
  client: SupabaseClient,
  profile: Profile,
  options: { throwOnErrors?: boolean } = {}
): Promise<ProfileContent> {
  const [links, socialLinks, projects, services, media] = await measureServer(
    "dashboard_relations_query",
    () =>
      Promise.all([
        measureServer("dashboard_links_query", () =>
          client.from("smart_links").select("*").eq("profile_id", profile.id).order("sort_order")
        ),
        measureServer("dashboard_social_links_query", () =>
          client.from("social_links").select("*").eq("profile_id", profile.id).order("sort_order")
        ),
        measureServer("dashboard_projects_query", () => queryProjectsForProfile(client, profile.id)),
        measureServer("dashboard_services_query", () =>
          client.from("services").select("*").eq("profile_id", profile.id).order("sort_order")
        ),
        measureServer("dashboard_media_query", () =>
          client.from("media").select("*").eq("profile_id", profile.id).order("position")
        ),
      ]),
    { profile_id: profile.id }
  );

  const errors = [links.error, socialLinks.error, projects.error, services.error, media.error].filter(Boolean);
  if (errors.length > 0) {
    console.warn("[DASHBOARD] profile_relation_load_partial_failure", {
      profile_id: profile.id,
      errors: errors.map((error) => ({
        code: error?.code,
        message: error?.message,
      })),
    });

    if (options.throwOnErrors) {
      throw new Error("profile_relation_load_failed");
    }
  }

  const projectRows = await resolveDashboardProjects(projects as RelationQueryResult, profile.id);
  const mappedLinks = (links.data || []).map(mapLinkRow);

  return {
    profile: { ...profile, socialLinks: (socialLinks.data || []).map(mapSocialLinkRow).filter((link) => link.isActive !== false) },
    links: mappedLinks,
    projects: projectRows.map(mapProjectRow),
    services: (services.data || []).map(mapServiceRow),
    media: (media.data || []).map(mapMediaRow),
  };
}

async function loadPublicProfileRelations(
  client: SupabaseClient,
  profile: Profile
): Promise<Omit<PublicProfile, keyof Profile> & { socialLinks: SocialLink[] }> {
  const [links, socialLinks, projects, services, media, themeRes] = await Promise.all([
    client.from("smart_links").select("*").eq("profile_id", profile.id).eq("is_active", true).order("is_featured", { ascending: false }).order("sort_order"),
    client.from("social_links").select("*").eq("profile_id", profile.id).eq("is_active", true).order("sort_order"),
    client.from("projects").select("*").eq("profile_id", profile.id).eq("is_active", true).order("position"),
    client.from("services").select("*").eq("profile_id", profile.id).eq("is_active", true).order("sort_order"),
    client.from("media").select("*").eq("profile_id", profile.id).order("position"),
    profile.themeId ? client.from("themes").select("*").eq("id", profile.themeId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);

  if (themeRes.data) {
    profile.theme = { id: themeRes.data.id, ...(themeRes.data.tokens || {}) };
  }

  const mappedLinks = (links.data || []).map(mapLinkRow);

  return {
    socialLinks: (socialLinks.data || []).map(mapSocialLinkRow),
    links: mappedLinks,
    projects: (projects.data || []).map(mapProjectRow),
    services: (services.data || []).map(mapServiceRow),
    gallery: (media.data || []).map(mapMediaRow),
  };
}

async function upsertProfileForUser(user: User, username: string, displayName: string, avatarUrl?: string | null) {
  return runSupabaseAdminOperation(async (admin) => {
    const payload = {
      user_id: user.id,
      username,
      display_name: displayName,
      avatar_url: avatarUrl || null,
      is_published: true,
      onboarding_completed: false,
    };

    let result = await admin
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (isMissingOnboardingColumnError(result.error)) {
      const { onboarding_completed: _ignored, ...fallbackPayload } = payload;
      result = await admin
        .from("profiles")
        .upsert(fallbackPayload, { onConflict: "user_id" })
        .select("*")
        .single();
    }

    return result;
  });
}

async function upsertProfileForUserWithAuthClient(
  client: SupabaseClient,
  user: User,
  username: string,
  displayName: string,
  avatarUrl?: string | null
) {
  const payload = {
    user_id: user.id,
    username,
    display_name: displayName,
    avatar_url: avatarUrl || null,
    is_published: true,
    onboarding_completed: false,
  };

  let result = await client
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (isMissingOnboardingColumnError(result.error)) {
    const { onboarding_completed: _ignored, ...fallbackPayload } = payload;
    result = await client
      .from("profiles")
      .upsert(fallbackPayload, { onConflict: "user_id" })
      .select("*")
      .single();
  }

  return result;
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
    debugLog("PROFILE", "profile_lookup_success", { auth_user_id: user.id, source: `${source}:auth_client` });
    return ensureProfilePublished(client, mapProfileRow(existingProfile.data));
  }

  const defaults = buildProfileDefaults(user, options);
  let createdProfile = await upsertProfileForUserWithAuthClient(
    client,
    user,
    defaults.username,
    defaults.displayName,
    defaults.avatarUrl
  );

  if (createdProfile.error?.code === "23505" && !options.username) {
    createdProfile = await upsertProfileForUserWithAuthClient(
      client,
      user,
      createUsernameCandidate(`${defaults.username}-${Math.floor(100000 + Math.random() * 900000)}`),
      defaults.displayName,
      defaults.avatarUrl
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

  debugLog("PROFILE", "profile_query_without_theme_embed", { auth_user_id: user.id });
  const existingProfile = await runSupabaseAdminOperation((admin) =>
    admin.from("profiles").select("*").eq("user_id", user.id).maybeSingle()
  );

  if (!existingProfile.ok) {
    if (existingProfile.error !== "admin_db_error") {
      if (options.allowFallbackProfile) {
        console.warn("[PROFILE] profile_admin_unavailable_using_session_fallback", {
          auth_user_id: user.id,
          source,
          error: existingProfile.error,
        });
        return buildFallbackProfileFromUser(user, options);
      }
      throw new Error(existingProfile.error);
    }
    logProfileLookupFailed(user.id, source, existingProfile.dbError);
    if (options.allowFallbackProfile) {
      console.warn("[PROFILE] profile_admin_lookup_failed_using_session_fallback", {
        auth_user_id: user.id,
        source,
        code: existingProfile.dbError?.code,
        message: existingProfile.dbError?.message,
      });
      return buildFallbackProfileFromUser(user, options);
    }
    throw new Error(formatAdminDbError(existingProfile.dbError));
  }

  if (existingProfile.result.data) {
    debugLog("PROFILE", "profile_lookup_success", { auth_user_id: user.id });
    return ensureProfilePublished(existingProfile.client, mapProfileRow(existingProfile.result.data));
  }

  const defaults = buildProfileDefaults(user, options);
  let createdProfile = await upsertProfileForUser(user, defaults.username, defaults.displayName, defaults.avatarUrl);

  if (!createdProfile.ok && createdProfile.error === "admin_db_error" && createdProfile.dbError?.code === "23505" && !options.username) {
    createdProfile = await upsertProfileForUser(
      user,
      createUsernameCandidate(`${defaults.username}-${Math.floor(100000 + Math.random() * 900000)}`),
      defaults.displayName,
      defaults.avatarUrl
    );
  }

  if (!createdProfile.ok) {
    if (options.allowFallbackProfile) {
      console.warn("[PROFILE] profile_create_failed_using_session_fallback", {
        auth_user_id: user.id,
        source,
        error: createdProfile.error,
        code: createdProfile.dbError?.code,
        message: createdProfile.dbError?.message,
      });
      return buildFallbackProfileFromUser(user, options);
    }
    if (createdProfile.error !== "admin_db_error") throw new Error(createdProfile.error);
    if (createdProfile.dbError) logProfileDbError("Failed to create default profile:", createdProfile.dbError);
    throw new Error(profileInsertErrorMessage(createdProfile.dbError));
  }

  const profile = mapProfileRow(createdProfile.result.data);
  logProfileCreated(user.id, profile.id, source);
  return profile;
}

export async function profileExistsForUser(userId: string, authClient?: SupabaseClient): Promise<boolean | null> {
  if (authClient) {
    const existingProfile = await authClient.from("profiles").select("id").eq("user_id", userId).maybeSingle();

    if (!existingProfile.error) {
      return Boolean(existingProfile.data);
    }

    logProfileLookupFailed(userId, "oauth", existingProfile.error);
  }

  const existingProfile = await runSupabaseAdminOperation((admin) =>
    admin.from("profiles").select("id").eq("user_id", userId).maybeSingle()
  );

  if (!existingProfile.ok) {
    if (existingProfile.error === "admin_db_error") {
      logProfileLookupFailed(userId, "oauth", existingProfile.dbError);
    }
    return null;
  }

  return Boolean(existingProfile.result.data);
}

export async function ensureOAuthProfileState(
  user: User,
  authClient: SupabaseClient
): Promise<{
  profile: Profile | null;
  exists: boolean;
  complete: boolean;
  missingFields: string[];
}> {
  const existingProfile = await authClient.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

  if (existingProfile.error) {
    logProfileLookupFailed(user.id, "oauth", existingProfile.error);
    throw new Error(formatAdminDbError(existingProfile.error));
  }

  if (existingProfile.data) {
    return {
      profile: mapProfileRow(existingProfile.data),
      exists: true,
      complete: isProfileRowComplete(existingProfile.data),
      missingFields: getMissingProfileFields(existingProfile.data),
    };
  }

  const profile = await getOrCreateProfile(user, {
    source: "oauth",
    authClient,
  });

  return {
    profile,
    exists: false,
    complete: false,
    missingFields: ["title", "bio"],
  };
}

export const getDashboardProfile = cache(async (): Promise<{
  supabase: SupabaseClient | null;
  user: User | null;
  profile: Profile | null;
}> => {
  if (!isSupabaseConfigured()) return { supabase: null, user: null, profile: null };

  const { supabase: client, user } = await getDashboardAuthenticatedUser();
  if (!user) return { supabase: client, user: null, profile: null };

  const profile = await measureServer(
    "dashboard_profile_query",
    () => getOrCreateProfile(user, { source: "dashboard", authClient: client, allowFallbackProfile: true }),
    { user_id: user.id }
  );

  return { supabase: client, user, profile };
});

export async function getMyProfile(): Promise<Profile | null> {
  const dashboardProfile = await getDashboardProfile();
  return dashboardProfile?.profile || null;
}

export async function getMyProfileContent() {
  debugLog("DASHBOARD", "dashboard_load_started");
  
  if (!isSupabaseConfigured()) {
    return null;
  }

  const dashboardProfile = await getDashboardProfile();
  const client = dashboardProfile?.supabase;
  const user = dashboardProfile?.user;
  if (!user) {
    console.warn("[AUTH] redirect_to_login_reason", { reason: "dashboard_auth_user_missing", path: "/dashboard" });
    console.warn("[DASHBOARD] getUser returned null");
    return null;
  }

  if (!client) {
    return emptyProfileContent(buildFallbackProfileFromUser(user, { source: "dashboard" }));
  }

  try {
    debugLog("DASHBOARD", "dashboard_session_user_id", { dashboard_session_user_id: user.id });
    
    const profile = dashboardProfile?.profile;
    if (!profile) {
      debugLog("DASHBOARD", "dashboard_profile_auto_created_failed");
      return emptyProfileContent(buildFallbackProfileFromUser(user, { source: "dashboard" }));
    }
    debugLog("DASHBOARD", "dashboard_profile_loaded", { 
      dashboard_current_user_id: user.id,
      dashboard_profile_id: profile.id,
      dashboard_using_demo_data: false
    });

    return await loadProfileContentFromClient(client, profile);
  } catch (error: any) {
    console.error("[DASHBOARD] dashboard_load_failed", { error: error?.message || error });
    return emptyProfileContent(buildFallbackProfileFromUser(user, { source: "dashboard" }));
  }
}

export async function requireMyProfileContent(path: string = "/dashboard") {
  const content = await getMyProfileContent();
  if (!content) {
    console.warn("[AUTH] redirect_to_login_reason", {
      reason: "dashboard_auth_missing_after_layout",
      path,
    });
    redirect(`/login?next=${encodeURIComponent(path)}`);
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

type PublicProfileOptions = {
  includeUnpublishedForUserId?: string;
  authClient?: SupabaseClient;
};

export async function getPublicProfile(username: string, options: PublicProfileOptions = {}): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  // Use admin client for public reads — RLS allows public SELECT on published profiles,
  const profileLookup = await runSupabaseAdminOperation((admin) =>
    admin.from("profiles").select("*").ilike("username", username).maybeSingle()
  );

  let profile: Profile | null = null;
  let readClient: SupabaseClient | null = null;

  if (profileLookup.ok) {
    profile = profileLookup.result.data ? mapProfileRow(profileLookup.result.data) : null;
    readClient = profileLookup.client;
  } else {
    if (profileLookup.dbError) {
      logProfileDbError("Failed to look up public profile with admin client:", profileLookup.dbError);
    }

    readClient = options.authClient || createSupabasePublicReadClient();
    if (!readClient) return null;

    const publicLookup = await readClient.from("profiles").select("*").ilike("username", username).maybeSingle();
    if (publicLookup.error) {
      logProfileDbError("Failed to look up public profile with session/public client:", publicLookup.error);
      return null;
    }

    profile = publicLookup.data ? mapProfileRow(publicLookup.data) : null;
  }
  const canViewUnpublished =
    Boolean(options.includeUnpublishedForUserId) && profile?.userId === options.includeUnpublishedForUserId;
  if (!profile) return null;
  if (!profile.isPublished && canViewUnpublished && options.authClient) {
    profile = await ensureProfilePublished(options.authClient, profile);
  }

  const { socialLinks, ...relations } = await loadPublicProfileRelations(readClient, profile);

  return {
    ...profile,
    socialLinks,
    ...relations,
  };
}
