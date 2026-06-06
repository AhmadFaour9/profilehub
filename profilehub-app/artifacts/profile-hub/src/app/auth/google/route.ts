import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerActionClient } from "@/modules/auth";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import { isSafeRedirectPath } from "@/modules/shared/validation";

function oauthErrorUrl(request: NextRequest) {
  const url = new URL("/auth/status", request.url);
  url.searchParams.set("status", "error");
  url.searchParams.set("type", "oauth_failed");
  return url;
}

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
      redirectTo: `${getAppUrl()}/auth/callback?type=oauth&next=${encodeURIComponent(safeNext)}`,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(oauthErrorUrl(request));
  }

  return NextResponse.redirect(data.url);
}
