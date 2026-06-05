"use server";

import { z } from "zod";
import { getAuthenticatedUser } from "@/modules/auth";
import { getRequestOrigin } from "@/lib/request-url";

type AccountActionResult = {
  ok: boolean;
  code?:
    | "email_already_exists"
    | "invalid_email"
    | "reauthentication_required"
    | "not_logged_in"
    | "rate_limited"
    | "unknown_error";
  message?: string;
  confirmationRequired?: boolean;
  email?: string | null;
  pendingEmail?: string | null;
};

const updateEmailSchema = z.object({
  email: z.string().trim().email(),
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
  const { data, error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${await getRequestOrigin()}/auth/callback?type=email_change&next=/dashboard/settings` }
  );

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

export async function sendAccountPasswordRecoveryEmail(): Promise<AccountActionResult> {
  const { supabase, user } = await getAuthenticatedUser("server_action");
  if (!user) {
    return { ok: false, code: "not_logged_in", message: messageForCode("not_logged_in") };
  }

  if (!user.email) {
    return { ok: false, code: "unknown_error", message: "No email address is attached to this account." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${await getRequestOrigin()}/auth/callback?type=password_recovery`,
  });

  if (error) {
    const code = normalizeAuthError(error.message, error.status);
    return { ok: false, code, message: messageForCode(code) };
  }

  return { ok: true, email: user.email, message: "We sent a secure password change link to your email." };
}
