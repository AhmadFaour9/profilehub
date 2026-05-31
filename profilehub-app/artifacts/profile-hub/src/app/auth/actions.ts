"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient, getCurrentUser } from "@/modules/auth";
import { getAppUrl, getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/env";
import { getSupabaseAdminConfig, type SupabaseAdminConfig } from "@/lib/supabase-admin-env";
import {
  formatAdminDbError,
  isSupabasePermissionError,
  runSupabaseAdminOperation,
  type SupabaseAdminOperationFailure,
} from "@/lib/supabase-admin-resolver";
import { getOrCreateProfile, getMyProfile } from "@/lib/profile-data";
import { auditLog, log } from "@/modules/logging";
import {  hashValue  } from "@/modules/shared/security";
import { profileFormSchema, usernameSchema } from "@/modules/shared";

export type AuthActionResult = {
  ok: boolean;
  message?: string;
};

type RegisterMessage =
  | "public_supabase_missing"
  | "service_role_missing"
  | "service_role_invalid"
  | "username_taken"
  | "auth_signup_failed"
  | "profile_insert_failed"
  | "schema_mismatch"
  | "register_success"
  | `admin_db_error:${string}`;

type SupabaseDbError = {
  code?: string;
  message: string;
};

const registerInputSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email(),
  password: z.string().min(8),
});

function isSchemaMismatchCode(code: string | undefined): boolean {
  return Boolean(code && ["42P01", "42703", "23502", "23514"].includes(code));
}

function mapProfileDbError(error: SupabaseDbError): RegisterMessage {
  if (error.code === "23505") return "username_taken";
  if (isSchemaMismatchCode(error.code)) return "schema_mismatch";
  if (isSupabasePermissionError(error)) return formatAdminDbError(error);
  return "profile_insert_failed";
}

function mapAdminOperationConfigError(failure: SupabaseAdminOperationFailure): RegisterMessage {
  if (failure.error === "admin_db_error") return formatAdminDbError(failure.dbError);
  return failure.error;
}

function logRegisterConfig(publicConfig: ReturnType<typeof getSupabasePublicConfig>, adminConfig: SupabaseAdminConfig) {
  console.info("[AUTH] Register Supabase config", {
    publicKeySource: publicConfig.keySource,
    adminKeySource: adminConfig.keySource,
    adminKeyType: adminConfig.keyType,
  });
}

function logSupabaseDbError(message: string, error: SupabaseDbError) {
  console.error(message, {
    code: error.code,
    message: error.message,
  });
}

export async function loginWithPassword(input: { email: string; password: string }): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase env is not configured." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    await log("warn", "auth", "Password login failed", { reason: error.message });
    return { ok: false, message: "Invalid email or password." };
  }

  if (data.user) await getOrCreateProfile(data.user);
  redirect("/dashboard");
}

export async function registerWithPassword(input: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const parsed = registerInputSchema.safeParse(input);
  if (!parsed.success) {
    console.warn("[AUTH] Register failed: invalid form input", {
      fields: parsed.error.issues.map((issue) => issue.path.join(".")),
    });
    return { ok: false, message: "auth_signup_failed" };
  }

  const publicConfig = getSupabasePublicConfig();
  const adminConfig = getSupabaseAdminConfig();
  logRegisterConfig(publicConfig, adminConfig);

  if (!publicConfig.ok) {
    console.error("[AUTH] Register failed: public_supabase_missing", {
      publicKeySource: publicConfig.keySource,
    });
    return { ok: false, message: "public_supabase_missing" };
  }

  if (!adminConfig.ok) {
    console.error(`[AUTH] Register failed: ${adminConfig.error}`, {
      adminKeySource: adminConfig.keySource,
      adminKeyType: adminConfig.keyType,
    });
    return { ok: false, message: adminConfig.error };
  }

  const { username, email, password } = parsed.data;
  const usernameCheck = await runSupabaseAdminOperation((admin) =>
    admin.from("profiles").select("id").eq("username", username).maybeSingle()
  );

  if (!usernameCheck.ok) {
    if (usernameCheck.error !== "admin_db_error") {
      return { ok: false, message: mapAdminOperationConfigError(usernameCheck) };
    }

    const error = usernameCheck.dbError;
    if (error) logSupabaseDbError("[AUTH] Register username pre-check failed", error);
    if (error && isSchemaMismatchCode(error.code)) return { ok: false, message: "schema_mismatch" };
    return { ok: false, message: formatAdminDbError(error) };
  }

  if (usernameCheck.result.data) {
    console.warn("[AUTH] Register failed: username_taken");
    return { ok: false, message: "username_taken" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: username,
      },
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    console.error("[AUTH] Register failed: Supabase signUp error", {
      message: error.message,
      status: error.status,
    });
    return { ok: false, message: "auth_signup_failed" };
  }

  if (!data.user) {
    console.error("[AUTH] Register failed: Supabase signUp returned no user.");
    return { ok: false, message: "auth_signup_failed" };
  }

  const user = data.user;
  const profileInsert = await runSupabaseAdminOperation((admin) =>
    admin
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          username,
          display_name: username,
          is_published: false,
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single()
  );

  if (!profileInsert.ok) {
    if (profileInsert.error !== "admin_db_error") {
      return { ok: false, message: mapAdminOperationConfigError(profileInsert) };
    }

    const error = profileInsert.dbError;
    if (error) logSupabaseDbError("[AUTH] Register profile insert failed", error);
    return { ok: false, message: error ? mapProfileDbError(error) : "profile_insert_failed" };
  }

  await auditLog({
    userId: user.id,
    action: "create",
    entityType: "profile",
    entityId: profileInsert.result.data?.id,
    metadata: { source: "email_signup" },
  });

  if (data.session) redirect("/onboarding");
  return { ok: true, message: "register_success" };
}

export async function sendPasswordReset(email: string): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase env is not configured." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/dashboard/settings`,
  });

  if (error) {
    await log("warn", "auth", "Password reset failed", { reason: error.message });
    return { ok: false, message: "Could not send reset email." };
  }

  return { ok: true };
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function updateProfile(input: unknown): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Supabase env is not configured; changes are not persisted." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "You must be logged in." };

  const currentProfile = await getMyProfile();
  if (!currentProfile) return { ok: false, message: "Profile not found." };

  const parsed = profileFormSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.username,
      display_name: parsed.displayName,
      title: parsed.title || "",
      bio: parsed.bio || "",
      location: parsed.location || "",
      website: parsed.website || "",
      seo_title: parsed.seoTitle || "",
      seo_description: parsed.seoDescription || "",
      is_published: parsed.isPublished ?? currentProfile.isPublished,
    })
    .eq("id", currentProfile.id);

  if (error) {
    await log("warn", "profile", "Profile update failed", { reason: error.message });
    return { ok: false, message: error.code === "23505" ? "Username is already taken." : "Could not update profile." };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath(`/${currentProfile.username}`);
  revalidatePath(`/${parsed.username}`);
  revalidateTag(`profile:${currentProfile.username}`, "max");
  revalidateTag(`profile:${parsed.username}`, "max");

  await auditLog({
    userId: user.id,
    action: "update",
    entityType: "profile",
    entityId: currentProfile.id,
    metadata: { usernameChanged: currentProfile.username !== parsed.username },
    ipHash: hashValue(null),
    userAgentHash: hashValue(null),
  });

  return { ok: true, message: "Profile updated." };
}
