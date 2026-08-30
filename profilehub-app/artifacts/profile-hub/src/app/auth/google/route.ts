import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerActionClient } from "@/modules/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getRequestOrigin } from "@/lib/request-url";
import { log } from "@/modules/logging";
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
  // The PKCE verifier cookie is written for the origin the visitor is actually
  // browsing, so the callback has to come back to that same origin or the
  // browser will not send the cookie and the exchange fails with "PKCE code
  // verifier not found in storage". Using a fixed APP_URL breaks any other
  // host - a preview deployment, a www prefix, a custom domain.
  const origin = await getRequestOrigin();

  const { supabase } = await createSupabaseServerActionClient("oauth_start");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?type=oauth&next=${encodeURIComponent(safeNext)}`,
    },
  });

  await log("info", "auth", "OAuth start", { origin, hasUrl: Boolean(data?.url) });

  if (error || !data.url) {
    return NextResponse.redirect(oauthErrorUrl(request));
  }

  return NextResponse.redirect(data.url);
}
