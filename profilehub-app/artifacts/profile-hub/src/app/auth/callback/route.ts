import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/modules/auth";
import { getOrCreateProfile } from "@/lib/profile-data";
import { isSafeRedirectPath } from "@/modules/shared/validation";
import { log } from "@/modules/logging";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const safeNext = isSafeRedirectPath(next) ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    await log("warn", "auth", "OAuth callback failed", { reason: error.message });
    return NextResponse.redirect(new URL("/login?error=callback", request.url));
  }

  if (data.user) {
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
