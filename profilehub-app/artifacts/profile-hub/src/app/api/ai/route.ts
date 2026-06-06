import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAIService, type AIFeature } from "@/modules/ai";
import { getAuthenticatedUser } from "@/modules/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { log } from "@/modules/logging";

const FEATURES = [
  "generate_bio",
  "improve_bio",
  "analyze_brand",
  "order_links",
  "suggest_smart_links",
  "project_names",
  "improve_project_description",
  "suggest_cta",
  "brand_score",
] as const satisfies readonly AIFeature[];

const bodySchema = z.object({
  feature: z.enum(FEATURES),
  input: z.record(z.unknown()).default({}),
});

function hasSelectedProject(input: Record<string, unknown>): boolean {
  const projectId = typeof input.projectId === "string" ? input.projectId.trim() : "";
  const project = input.project && typeof input.project === "object" && !Array.isArray(input.project)
    ? input.project as Record<string, unknown>
    : {};
  const nestedProjectId = typeof project.id === "string" ? project.id.trim() : "";
  return Boolean(projectId || nestedProjectId);
}

function providerErrorPayload(error: unknown) {
  const message = error instanceof Error ? error.message : "AI request failed.";
  const debugCode = error && typeof error === "object" && "debugCode" in error ? String(error.debugCode) : undefined;
  const status = error && typeof error === "object" && "status" in error ? Number(error.status) : undefined;
  const attemptedModels = error && typeof error === "object" && "attemptedModels" in error && Array.isArray(error.attemptedModels)
    ? error.attemptedModels.map(String)
    : undefined;

  return {
    message,
    payload: {
      error: message,
      debugCode,
      provider: process.env.AI_PROVIDER || "default",
      model: process.env.OPENROUTER_MODEL || null,
      attemptedModels,
      httpStatus: Number.isFinite(status) ? status : undefined,
    },
  };
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid AI request." }, { status: 400 });
  }

  if (parsed.data.feature === "improve_project_description" && !hasSelectedProject(parsed.data.input)) {
    return NextResponse.json({ error: "No project selected" }, { status: 400 });
  }

  let client: SupabaseClient | null = null;
  let userId = "local-dev-user";

  if (isSupabaseConfigured()) {
    const auth = await getAuthenticatedUser("api_route");
    client = auth.supabase;

    if (!auth.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    userId = auth.user.id;
  }

  const aiService = createAIService(client, userId);

  try {
    console.info("[ai] api_ai_provider_config", {
      AI_PROVIDER: process.env.AI_PROVIDER?.trim() || "default",
      feature: parsed.data.feature,
    });

    const response = await aiService.runAI(parsed.data.feature, parsed.data.input);
    return NextResponse.json(response);
  } catch (error) {
    const { message, payload } = providerErrorPayload(error);
    await log("warn", "ai", "AI request failed", { feature: parsed.data.feature, reason: message });
    return NextResponse.json(payload, { status: 500 });
  }
}
