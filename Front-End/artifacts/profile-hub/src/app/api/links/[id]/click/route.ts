import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/modules/auth";
import { isSupabaseConfigured } from "@/lib/env";
import {  getRequestIp, getUserAgent, hashValue  } from "@/modules/shared/security";
import { httpUrlSchema } from "@/modules/shared";
import { log } from "@/modules/logging";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fallback = request.nextUrl.searchParams.get("to") || "/";
  let target = httpUrlSchema.safeParse(fallback).success ? fallback : "/";

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(target);
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.redirect(target);

  const { data: link, error } = await supabase
    .from("links")
    .select("id, profile_id, url, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error || !link || !link.is_active) {
    if (error) await log("warn", "analytics", "Link click lookup failed", { reason: error.message });
    return NextResponse.redirect(target);
  }

  target = link.url;
  const userAgent = getUserAgent(request);
  const ip = getRequestIp(request);
  const visitorSource = `${ip || ""}:${userAgent || ""}`;

  const [{ error: insertError }, { error: incrementError }] = await Promise.all([
    supabase.from("link_clicks").insert({
      profile_id: link.profile_id,
      link_id: link.id,
      visitor_id_hash: hashValue(visitorSource),
      referrer: request.headers.get("referer"),
      user_agent_hash: hashValue(userAgent),
    }),
    supabase.rpc("increment_link_click_count", { target_link_id: link.id }),
  ]);

  if (insertError || incrementError) {
    await log("warn", "analytics", "Link click tracking failed", {
      insertError: insertError?.message,
      incrementError: incrementError?.message,
    });
  }

  return NextResponse.redirect(target);
}
