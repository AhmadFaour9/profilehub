"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/modules/auth";
import { getAppUrl, getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/env";
import { getSupabaseAdminConfig, type SupabaseAdminConfig } from "@/lib/supabase-admin-env";
import {
  formatAdminDbError,
  runSupabaseAdminOperation,
  type SupabaseAdminOperationFailure,
} from "@/lib/supabase-admin-resolver";
import { getOrCreateProfile } from "@/lib/profile-data";
import { auditLog, log } from "@/modules/logging";
import {  hashValue  } from "@/modules/shared/security";
import { isSafeRedirectPath, profileFormSchema, usernameSchema } from "@/modules/shared";

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

export async function loginWithPassword(input: { email: string; password: string; next?: string }): Promise<AuthActionResult> {
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

  if (data.user) {
    try {
      await getOrCreateProfile(data.user, { source: "login", authClient: supabase });
    } catch (error: any) {
      console.warn("[AUTH] login_profile_ensure_failed_continuing", {
        auth_user_id: data.user.id,
        error: error?.message || error,
      });
    }
  }
  redirect(isSafeRedirectPath(input.next) ? input.next : "/dashboard");
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
  console.info("[AUTH] auth_user_id", { auth_user_id: user.id });

  let profile;
  try {
    profile = await getOrCreateProfile(user, {
      username,
      displayName: username,
      source: "signup",
      authClient: supabase,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "profile_insert_failed";
    console.error("[AUTH] Register profile creation failed", {
      auth_user_id: user.id,
      message,
    });

    if (message === "username_taken") return { ok: false, message: "username_taken" };
    if (message === "schema_mismatch") return { ok: false, message: "schema_mismatch" };
    if (message.startsWith("admin_db_error:")) return { ok: false, message: message as `admin_db_error:${string}` };
    if (message === "service_role_missing" || message === "service_role_invalid" || message === "public_supabase_missing") {
      return { ok: false, message };
    }
    return { ok: false, message: "profile_insert_failed" };
  }

  await auditLog({
    userId: user.id,
    action: "create",
    entityType: "profile",
    entityId: profile?.id,
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
