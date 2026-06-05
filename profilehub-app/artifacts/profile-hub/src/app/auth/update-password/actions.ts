"use server";

import { z } from "zod";
import { getAuthenticatedUser } from "@/modules/auth";

type UpdatePasswordResult = {
  ok: boolean;
  code?: "not_logged_in" | "weak_password" | "password_mismatch" | "same_password" | "rate_limited" | "unknown_error";
  message?: string;
};

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[a-z]/, "Password must include a lowercase letter.")
      .regex(/[A-Z]/, "Password must include an uppercase letter.")
      .regex(/[0-9]/, "Password must include a number."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match.",
  });

function normalizePasswordError(message: string | undefined, status?: number): UpdatePasswordResult["code"] {
  const normalized = (message || "").toLowerCase();

  if (status === 429 || normalized.includes("rate")) return "rate_limited";
  if (normalized.includes("weak") || normalized.includes("strength") || normalized.includes("password should")) {
    return "weak_password";
  }
  if (normalized.includes("same password") || normalized.includes("different from the old password")) {
    return "same_password";
  }

  return "unknown_error";
}

function messageForCode(code: UpdatePasswordResult["code"]) {
  switch (code) {
    case "not_logged_in":
      return "This password reset link is invalid or expired.";
    case "weak_password":
      return "Use at least 8 characters with uppercase, lowercase, and a number.";
    case "password_mismatch":
      return "Passwords must match.";
    case "same_password":
      return "Choose a password different from your current password.";
    case "rate_limited":
      return "Too many attempts. Please try again later.";
    default:
      return "Could not update password.";
  }
}

export async function updateRecoveredPassword(input: unknown): Promise<UpdatePasswordResult> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    const confirmIssue = parsed.error.issues.find((issue) => issue.path.includes("confirmPassword"));
    const code = confirmIssue ? "password_mismatch" : "weak_password";
    return { ok: false, code, message: messageForCode(code) };
  }

  const { supabase, user } = await getAuthenticatedUser("server_action");
  if (!user) {
    return { ok: false, code: "not_logged_in", message: messageForCode("not_logged_in") };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const code = normalizePasswordError(error.message, error.status);
    return { ok: false, code, message: messageForCode(code) };
  }

  return { ok: true, message: "Password updated successfully." };
}
