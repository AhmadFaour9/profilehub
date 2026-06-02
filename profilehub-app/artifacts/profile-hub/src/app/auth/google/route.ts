import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerActionClient } from "@/modules/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { isSafeRedirectPath } from "@/modules/shared/validation";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=supabase_env", request.url));
  }

  const next = request.nextUrl.searchParams.get("next") || "/dashboard";
  const safeNext = isSafeRedirectPath(next) ? next : "/dashboard";
  const { supabase } = await createSupabaseServerActionClient("oauth_start");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=oauth_start_failed", request.url));
  }

  return NextResponse.redirect(data.url);
}
