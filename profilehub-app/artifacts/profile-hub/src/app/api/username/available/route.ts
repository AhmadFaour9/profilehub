import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/modules/auth";
import { usernameSchema } from "@/modules/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public username availability, for the claim field on the landing page.
 *
 * Deliberately narrow: it answers one boolean about a name the visitor typed
 * and returns nothing else about the account behind it. Enumerating which
 * usernames exist is already possible by requesting /{username}, so this
 * exposes no new information - but it makes doing so cheap, hence the limit
 * below.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

// The map is per-instance and unbounded otherwise; drop expired keys as we go.
function sweep() {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key);
  }
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const client =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(client)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (hits.size > 5_000) sweep();

  const raw = request.nextUrl.searchParams.get("username") ?? "";
  const parsed = usernameSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({
      username: raw.trim().toLowerCase(),
      valid: false,
      available: false,
      reason: parsed.error.issues[0]?.message ?? "invalid",
    });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    // Fail closed: claiming a name is available and then rejecting it at signup
    // is a worse experience than asking the visitor to try again.
    return NextResponse.json({ error: "lookup_failed" }, { status: 503 });
  }

  return NextResponse.json({
    username: parsed.data,
    valid: true,
    available: !data,
  });
}
