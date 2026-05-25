"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabaseAdminClient } from "@/modules/auth";
import { createSupabaseServerClient, getCurrentUser } from "@/modules/auth";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import { getOrCreateProfile, getMyProfile } from "@/lib/profile-data";
import { auditLog, log } from "@/modules/logging";
import {  hashValue  } from "@/modules/shared/security";
import { profileFormSchema, usernameSchema } from "@/modules/shared";

export type AuthActionResult = {
  ok: boolean;
  message?: string;
};

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
  if (!isSupabaseConfigured()) {
    console.error("[AUTH] Register failed: Supabase env is not configured.");
    return { ok: false, message: "invalid_config" };
  }

  const username = usernameSchema.parse(input.username);
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data, error: adminErr } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
    if (adminErr) {
      console.error("[AUTH] Register failed: Admin DB error (RLS or missing table)", adminErr.message);
      return { ok: false, message: "profile_creation_failed" };
    }
    if (data) {
      console.warn(`[AUTH] Register failed: Username ${username} already taken`);
      return { ok: false, message: "username_taken" };
    }
  } else {
    console.error("[AUTH] Register failed: Missing service role key.");
    return { ok: false, message: "invalid_config" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        username,
        display_name: username,
      },
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    console.error("[AUTH] Register failed: Supabase signUp error", error.message);
    if (error.message.includes("Signups not allowed") || error.message.includes("disabled")) {
      return { ok: false, message: "email_signup_disabled" };
    }
    return { ok: false, message: "profile_creation_failed" };
  }

  if (data.user) {
    try {
      const profile = await getOrCreateProfile(data.user);
      await auditLog({
        userId: data.user.id,
        action: "create",
        entityType: "profile",
        entityId: profile?.id,
        metadata: { source: "email_signup" },
      });
    } catch (profileErr: any) {
      const msg = profileErr instanceof Error ? profileErr.message : "profile_creation_failed";
      console.error("[AUTH] Register failed: getOrCreateProfile threw an error", profileErr?.message || profileErr);
      return { ok: false, message: msg };
    }
  }

  if (data.session) redirect("/onboarding");
  return { ok: true, message: "Check your email to confirm your account." };
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
