import { NextResponse, type NextRequest } from "next/server";

import { createAIService } from "@/modules/ai";
import { getAuthenticatedUser } from "@/modules/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n";
import { log } from "@/modules/logging";
import { parseResumeAnalysis } from "@/lib/resume/analysis";
import {
  MAX_RESUME_BYTES,
  extractResumeTextFromFile,
  prepareResumeText,
  type ExtractionError,
} from "@/lib/resume/extract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// PDF parsing plus a model round-trip needs more than the default budget.
export const maxDuration = 60;

const ERROR_STATUS: Record<ExtractionError, number> = {
  file_too_large: 413,
  unsupported_type: 415,
  extract_failed: 422,
  too_short: 422,
};

export async function POST(request: NextRequest) {
  // Resume text is personal data. Nothing below logs or persists it — only
  // sizes, outcomes, and the model name are recorded.
  let userId = "local-dev-user";
  let client = null;

  if (isSupabaseConfigured()) {
    const auth = await getAuthenticatedUser("api_route");
    if (!auth.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    client = auth.supabase;
    userId = auth.user.id;
  }

  let extraction;
  let locale: string = DEFAULT_LOCALE;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const requested = formData.get("locale");
    if (typeof requested === "string" && isLocale(requested)) locale = requested;

    const file = formData.get("file");
    const pasted = formData.get("text");

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_RESUME_BYTES) {
        return NextResponse.json({ error: "file_too_large" }, { status: 413 });
      }
      extraction = await extractResumeTextFromFile(file);
    } else if (typeof pasted === "string") {
      extraction = prepareResumeText(pasted);
    } else {
      return NextResponse.json({ error: "no_input" }, { status: 400 });
    }
  } else {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const requested = (body as Record<string, unknown>).locale;
    if (typeof requested === "string" && isLocale(requested)) locale = requested;

    const text = (body as Record<string, unknown>).text;
    if (typeof text !== "string") {
      return NextResponse.json({ error: "no_input" }, { status: 400 });
    }
    extraction = prepareResumeText(text);
  }

  if (!extraction.ok) {
    return NextResponse.json({ error: extraction.error }, { status: ERROR_STATUS[extraction.error] });
  }

  const aiService = createAIService(client, userId);

  try {
    const result = await aiService.runAI("analyze_resume", {
      resumeText: extraction.text,
      locale,
    });

    const analysis = parseResumeAnalysis(result.content ?? result.text ?? "");

    if (!analysis) {
      await log("warn", "ai", "Resume analysis returned unparseable output", {
        userId,
        characters: extraction.characters,
        provider: result.provider,
      });
      return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
    }

    await log("info", "ai", "Resume analyzed", {
      userId,
      characters: extraction.characters,
      kind: extraction.kind,
      provider: result.provider,
      fallback: Boolean(result.fallback),
      overallScore: analysis.overallScore,
    });

    return NextResponse.json({
      analysis,
      meta: {
        provider: result.provider,
        model: result.model ?? null,
        fallback: Boolean(result.fallback),
        characters: extraction.characters,
        truncated: extraction.truncated,
        kind: extraction.kind,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resume analysis failed.";
    await log("warn", "ai", "Resume analysis failed", { userId, reason: message });
    return NextResponse.json({ error: "analysis_failed" }, { status: 500 });
  }
}
