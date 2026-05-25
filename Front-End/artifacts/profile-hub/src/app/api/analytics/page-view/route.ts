import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/modules/auth";
import {  detectDevice, getRequestIp, getUserAgent, hashValue  } from "@/modules/shared/security";
import { isSupabaseConfigured } from "@/lib/env";
import { log } from "@/modules/logging";

const bodySchema = z.object({
  profileId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true });

  const body = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ ok: true });

  const userAgent = getUserAgent(request);
  const ip = getRequestIp(request);
  const visitorSource = `${ip || ""}:${userAgent || ""}`;

  const { error } = await supabase.from("page_views").insert({
    profile_id: body.data.profileId,
    visitor_id_hash: hashValue(visitorSource),
    referrer: request.headers.get("referer"),
    user_agent_hash: hashValue(userAgent),
    device: detectDevice(userAgent),
  });

  if (error) {
    await log("warn", "analytics", "Page view insert failed", { reason: error.message });
  }

  return NextResponse.json({ ok: true });
}
