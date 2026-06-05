import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerActionClient, getAuthenticatedUser } from "@/modules/auth";
import { getOrCreateProfile } from "@/lib/profile-data";
import { debugLog, measureServer } from "@/lib/perf";
import { isSafeRedirectPath } from "@/modules/shared/validation";
import { log } from "@/modules/logging";

type AuthCallbackType = "oauth" | "email_confirm" | "email_change" | "password_recovery";
type AuthStatusType = "email_confirm" | "email_updated" | "password_recovery" | "expired" | "unknown";
type VerifyOtpType = "signup" | "email_change" | "recovery" | "email";

function normalizeCallbackType(rawType: string | null, next: string | null): AuthCallbackType {
  if (rawType === "password_recovery" || rawType === "recovery") return "password_recovery";
  if (rawType === "email_change") return "email_change";
  if (rawType === "email_confirm" || rawType === "signup" || rawType === "email") return "email_confirm";
  if (next === "/onboarding") return "email_confirm";
  return "oauth";
}

function toVerifyOtpType(rawType: string | null): VerifyOtpType {
  if (rawType === "password_recovery" || rawType === "recovery") return "recovery";
  if (rawType === "email_change") return "email_change";
  if (rawType === "email_confirm" || rawType === "signup") return "signup";
  return "email";
}

function authStatusUrl(
  request: NextRequest,
  status: "success" | "error",
  type: AuthStatusType,
  next?: string | null
) {
  const url = new URL("/auth/status", request.url);
  url.searchParams.set("status", status);
  url.searchParams.set("type", type);
  if (next && isSafeRedirectPath(next)) url.searchParams.set("next", next);
  return url;
}

export async function GET(request: NextRequest) {
  debugLog("AUTH", "auth_callback_started", {
    has_code: Boolean(request.nextUrl.searchParams.get("code")),
    has_token_hash: Boolean(request.nextUrl.searchParams.get("token_hash")),
    type: request.nextUrl.searchParams.get("type"),
  });

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const next = request.nextUrl.searchParams.get("next");
  const safeNext = isSafeRedirectPath(next) ? next : "/dashboard";
  const callbackType = normalizeCallbackType(rawType, next);

  if (!code && !tokenHash) {
    return NextResponse.redirect(authStatusUrl(request, "error", "expired"));
  }

  const { supabase, cookieDiagnostics } = await createSupabaseServerActionClient("auth_callback");
  const { data, error } = code
    ? await measureServer("auth_callback_exchangeCodeForSession", () => supabase.auth.exchangeCodeForSession(code))
    : await measureServer("auth_callback_verifyOtp", () =>
        supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: toVerifyOtpType(rawType),
        })
      );

  if (error) {
    await log("warn", "auth", "Auth callback failed", { reason: error.message, type: callbackType });
    return NextResponse.redirect(authStatusUrl(request, "error", "expired"));
  }

  debugLog("AUTH", "auth_callback_exchange_success", {
    type: callbackType,
    session_exists: Boolean(data.session),
    set_cookie_names: cookieDiagnostics.setAttempted,
    set_cookie_success_count: cookieDiagnostics.setSucceeded.length,
    set_cookie_failed_count: cookieDiagnostics.setFailed.length,
  });

  const callbackUser = data.user;

  if (callbackUser && callbackType !== "password_recovery") {
    debugLog("AUTH", "auth_callback_session_created", { user_id: callbackUser.id });
    await getAuthenticatedUser("auth_callback");
    try {
      await measureServer("auth_callback_profile_query", () =>
        getOrCreateProfile(callbackUser, { source: "auth_callback", authClient: supabase })
      );
    } catch (error: any) {
      console.warn("[AUTH] callback_profile_ensure_failed_continuing", {
        auth_user_id: callbackUser.id,
        error: error?.message || error,
      });
    }
  }

  if (callbackType === "password_recovery") {
    return NextResponse.redirect(new URL("/auth/update-password", request.url));
  }

  if (callbackType === "email_change") {
    return NextResponse.redirect(authStatusUrl(request, "success", "email_updated", safeNext));
  }

  if (callbackType === "email_confirm") {
    return NextResponse.redirect(authStatusUrl(request, "success", "email_confirm", safeNext));
  }

  return NextResponse.redirect(new URL(safeNext, request.url));
}
