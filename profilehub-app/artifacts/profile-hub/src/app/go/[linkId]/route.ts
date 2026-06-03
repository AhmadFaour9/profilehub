import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/modules/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getRequestIp, getUserAgent, hashValue } from "@/modules/shared/security";
import { httpUrlSchema } from "@/modules/shared";
import { log } from "@/modules/logging";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params;
  const fallback = new URL("/", request.url);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(fallback);
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.redirect(fallback);

  const { data: link, error } = await supabase
    .from("smart_links")
    .select("id, profile_id, url, is_active, profiles!inner(is_published)")
    .eq("id", linkId)
    .maybeSingle();

  const profile = Array.isArray((link as any)?.profiles) ? (link as any)?.profiles[0] : (link as any)?.profiles;
  const parsedTarget = httpUrlSchema.safeParse((link as any)?.url);

  if (error || !link || !link.is_active || !profile?.is_published || !parsedTarget.success) {
    if (error) await log("warn", "analytics", "Smart link lookup failed", { reason: error.message });
    return NextResponse.redirect(fallback);
  }

  const userAgent = getUserAgent(request);
  const ip = getRequestIp(request);
  const visitorSource = `${ip || ""}:${userAgent || ""}`;

  const [{ error: insertError }, { error: incrementError }] = await Promise.all([
    supabase.from("smart_link_clicks").insert({
      profile_id: link.profile_id,
      smart_link_id: link.id,
      visitor_id_hash: hashValue(visitorSource),
      referrer: request.headers.get("referer"),
      user_agent_hash: hashValue(userAgent),
    }),
    supabase.rpc("increment_smart_link_click_count", { target_link_id: link.id }),
  ]);

  if (insertError || incrementError) {
    await log("warn", "analytics", "Smart link click tracking failed", {
      insertError: insertError?.message,
      incrementError: incrementError?.message,
    });
  }

  return NextResponse.redirect(parsedTarget.data);
}
