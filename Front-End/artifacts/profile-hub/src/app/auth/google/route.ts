import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/modules/auth";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import { isSafeRedirectPath } from "@/modules/shared/validation";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=supabase_env", request.url));
  }

  const next = request.nextUrl.searchParams.get("next");
  const safeNext = isSafeRedirectPath(next) ? next : "/onboarding";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  return NextResponse.redirect(data.url);
}
