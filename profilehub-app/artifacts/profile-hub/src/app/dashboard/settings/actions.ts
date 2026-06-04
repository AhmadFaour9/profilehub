"use server";

import { z } from "zod";
import { getAuthenticatedUser } from "@/modules/auth";

type AccountActionResult = {
  ok: boolean;
  code?:
    | "email_already_exists"
    | "invalid_email"
    | "reauthentication_required"
    | "not_logged_in"
    | "rate_limited"
    | "weak_password"
    | "same_password"
    | "password_mismatch"
    | "unknown_error";
  message?: string;
  confirmationRequired?: boolean;
  email?: string | null;
  pendingEmail?: string | null;
};

const updateEmailSchema = z.object({
  email: z.string().trim().email(),
});

const changePasswordSchema = z
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

function normalizeAuthError(message: string | undefined, status?: number): AccountActionResult["code"] {
  const normalized = (message || "").toLowerCase();

  if (status === 429 || normalized.includes("rate")) return "rate_limited";
  if (status === 401 || status === 403 || normalized.includes("reauth") || normalized.includes("recent")) {
    return "reauthentication_required";
  }
  if (normalized.includes("already") || normalized.includes("registered") || normalized.includes("exists")) {
    return "email_already_exists";
  }
  if (normalized.includes("invalid") && normalized.includes("email")) return "invalid_email";
  if (normalized.includes("weak") || normalized.includes("strength") || normalized.includes("password should")) {
    return "weak_password";
  }
  if (normalized.includes("same password") || normalized.includes("different from the old password")) {
    return "same_password";
  }

  return "unknown_error";
}

function messageForCode(code: AccountActionResult["code"]) {
  switch (code) {
    case "email_already_exists":
      return "This email is already in use.";
    case "invalid_email":
      return "Enter a valid email address.";
    case "reauthentication_required":
      return "Please log out and log in again, then retry.";
    case "rate_limited":
      return "Too many attempts. Please try again later.";
    case "weak_password":
      return "Use at least 8 characters with uppercase, lowercase, and a number.";
    case "same_password":
      return "Choose a password different from your current password.";
    case "password_mismatch":
      return "Passwords must match.";
    case "not_logged_in":
      return "Please sign in again.";
    default:
      return "Request failed.";
  }
}

export async function updateAccountEmail(input: unknown): Promise<AccountActionResult> {
  const parsed = updateEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_email", message: messageForCode("invalid_email") };
  }

  const { supabase, user } = await getAuthenticatedUser("server_action");
  if (!user) {
    return { ok: false, code: "not_logged_in", message: messageForCode("not_logged_in") };
  }

  const newEmail = parsed.data.email;
  const { data, error } = await supabase.auth.updateUser({ email: newEmail });

  if (error) {
    const code = normalizeAuthError(error.message, error.status);
    return { ok: false, code, message: messageForCode(code) };
  }

  const returnedUser = data.user;
  const pendingEmail = typeof (returnedUser as any)?.new_email === "string" ? (returnedUser as any).new_email : null;
  const currentEmail = returnedUser?.email || user.email || null;
  const confirmationRequired = Boolean(pendingEmail && pendingEmail.toLowerCase() === newEmail.toLowerCase());

  return {
    ok: true,
    confirmationRequired,
    email: currentEmail,
    pendingEmail: pendingEmail || (confirmationRequired ? newEmail : null),
    message: confirmationRequired
      ? "Check your new email address to confirm the change."
      : "Email updated successfully.",
  };
}

export async function changeAccountPassword(input: unknown): Promise<AccountActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
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
    const code = normalizeAuthError(error.message, error.status);
    return { ok: false, code, message: messageForCode(code) };
  }

  return { ok: true, message: "Password updated successfully." };
}
