import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAIService, type AIFeature } from "@/modules/ai";
import { createSupabaseServerClient } from "@/modules/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { log } from "@/modules/logging";

const FEATURES = [
  "generate_bio",
  "analyze_brand",
  "order_links",
  "project_names",
  "improve_project_description",
  "suggest_cta",
  "brand_score",
] as const satisfies readonly AIFeature[];

const bodySchema = z.object({
  feature: z.enum(FEATURES),
  input: z.record(z.unknown()).default({}),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid AI request." }, { status: 400 });
  }

  let client: SupabaseClient | null = null;
  let userId = "local-dev-user";

  if (isSupabaseConfigured()) {
    client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    userId = user.id;
  }

  const aiService = createAIService(client, userId);

  try {
    const response = await aiService.runAI(parsed.data.feature, parsed.data.input);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed.";
    await log("warn", "ai", "AI request failed", { feature: parsed.data.feature, reason: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
