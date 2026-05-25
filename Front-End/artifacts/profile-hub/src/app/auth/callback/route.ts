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
    await getOrCreateProfile(data.user);
  }

  return NextResponse.redirect(new URL(safeNext, request.url));
}
