import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerActionClient, getAuthenticatedUser } from "@/modules/auth";
import { getOrCreateProfile } from "@/lib/profile-data";
import { isSafeRedirectPath } from "@/modules/shared/validation";
import { log } from "@/modules/logging";

export async function GET(request: NextRequest) {
  console.info("[AUTH] auth_callback_started", {
    has_code: Boolean(request.nextUrl.searchParams.get("code")),
  });

  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const safeNext = isSafeRedirectPath(next) ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const { supabase, cookieDiagnostics } = await createSupabaseServerActionClient("auth_callback");
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    await log("warn", "auth", "OAuth callback failed", { reason: error.message });
    return NextResponse.redirect(new URL("/login?error=callback", request.url));
  }

  console.info("[AUTH] auth_callback_exchange_success", {
    session_exists: Boolean(data.session),
    set_cookie_names: cookieDiagnostics.setAttempted,
    set_cookie_success_count: cookieDiagnostics.setSucceeded.length,
    set_cookie_failed_count: cookieDiagnostics.setFailed.length,
  });

  if (data.user) {
    console.info("[AUTH] auth_callback_session_created", { user_id: data.user.id });
    await getAuthenticatedUser("auth_callback");
    try {
      await getOrCreateProfile(data.user, { source: "auth_callback", authClient: supabase });
    } catch (error: any) {
      console.warn("[AUTH] callback_profile_ensure_failed_continuing", {
        auth_user_id: data.user.id,
        error: error?.message || error,
      });
    }
  }

  return NextResponse.redirect(new URL(safeNext, request.url));
}
