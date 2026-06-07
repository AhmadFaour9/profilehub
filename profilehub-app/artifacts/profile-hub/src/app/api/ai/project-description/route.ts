import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateProfile } from "@/lib/profile-data";
import { debugLog } from "@/lib/perf";
import { createAIService } from "@/modules/ai";
import { getAuthenticatedUser } from "@/modules/auth";

type ProjectDescriptionVariants = {
  improved: string;
  shorter: string;
  marketing: string;
  technical: string;
};

const requestSchema = z.object({
  projectId: z.string().trim().min(1, "No project selected"),
  title: z.string().trim().max(140).optional(),
  description: z.string().trim().max(1200).optional(),
  repoUrl: z.string().trim().max(2048).optional(),
  projectUrl: z.string().trim().max(2048).optional(),
  tags: z.array(z.string().trim().max(40)).max(12).optional(),
});

const EMPTY_VARIANTS: ProjectDescriptionVariants = {
  improved: "",
  shorter: "",
  marketing: "",
  technical: "",
};

const TECHNOLOGY_HINTS = [
  "next.js",
  "nextjs",
  "react",
  "typescript",
  "javascript",
  "node.js",
  "node",
  "supabase",
  "postgres",
  "postgresql",
  "tailwind",
  "vercel",
  "python",
  "fastapi",
  "django",
  "flask",
  "java",
  "spring",
  "c#",
  ".net",
  "asp.net",
  "php",
  "laravel",
  "go",
  "rust",
  "docker",
  "kubernetes",
  "firebase",
  "mongodb",
  "mysql",
  "redis",
  "graphql",
  "rest",
];

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status });
}

function parseGithubRepo(repoUrl: string | null | undefined): { owner: string; repo: string } | null {
  if (!repoUrl) return null;

  try {
    const normalized = repoUrl.startsWith("http") ? repoUrl : `https://${repoUrl}`;
    const url = new URL(normalized);
    if (!["github.com", "www.github.com"].includes(url.hostname.toLowerCase())) return null;

    const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
    const repo = rawRepo?.replace(/\.git$/i, "");
    return owner && repo ? { owner, repo } : null;
  } catch {
    return null;
  }
}

async function fetchGithubReadme(repoUrl: string | null | undefined): Promise<string> {
  const repo = parseGithubRepo(repoUrl);
  if (!repo) return "";

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/readme`, {
      headers,
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return "";

    const data = await response.json();
    if (data?.encoding !== "base64" || typeof data.content !== "string") return "";

    return Buffer.from(data.content, "base64")
      .toString("utf-8")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
  } catch {
    return "";
  }
}

function extractTechnologies(readme: string, tags: string[]): string[] {
  const values = new Set(tags.map((tag) => tag.trim()).filter(Boolean));
  const lowerReadme = readme.toLowerCase();

  TECHNOLOGY_HINTS.forEach((technology) => {
    if (lowerReadme.includes(technology)) values.add(technology);
  });

  return Array.from(values).slice(0, 16);
}

function cleanVariant(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, 900)
    : "";
}

function extractJsonObject(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function firstSentence(content: string): string {
  return content.split(/(?<=[.!?])\s+/)[0]?.trim().slice(0, 220) || content.slice(0, 220);
}

function parseVariants(content: string): ProjectDescriptionVariants {
  const parsed = extractJsonObject(content);

  if (parsed) {
    return {
      improved: cleanVariant(parsed.improved),
      shorter: cleanVariant(parsed.shorter),
      marketing: cleanVariant(parsed.marketing),
      technical: cleanVariant(parsed.technical),
    };
  }

  const cleaned = cleanVariant(content);
  return {
    ...EMPTY_VARIANTS,
    improved: cleaned,
    shorter: firstSentence(cleaned),
    marketing: cleaned,
    technical: cleaned,
  };
}

function hasAnyVariant(variants: ProjectDescriptionVariants): boolean {
  return Boolean(variants.improved || variants.shorter || variants.marketing || variants.technical);
}

function providerErrorJson(error: unknown) {
  const message = error instanceof Error ? error.message : "AI request failed.";
  const debugCode = error && typeof error === "object" && "debugCode" in error ? String(error.debugCode) : undefined;
  const status = error && typeof error === "object" && "status" in error ? Number(error.status) : undefined;
  const attemptedModels = error && typeof error === "object" && "attemptedModels" in error && Array.isArray(error.attemptedModels)
    ? error.attemptedModels.map(String)
    : undefined;

  return json({
    ok: false,
    error: message,
    debugCode,
    provider: process.env.AI_PROVIDER || "default",
    model: process.env.OPENROUTER_MODELS || process.env.OPENROUTER_MODEL || null,
    attemptedModels,
    httpStatus: Number.isFinite(status) ? status : undefined,
  }, 502);
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ ok: false, error: "No project selected" }, 400);
  }

  const { supabase, user } = await getAuthenticatedUser("api_route");
  if (!user) {
    return json({ ok: false, error: "Unauthorized." }, 401);
  }

  const profile = await getOrCreateProfile(user, { source: "dashboard", authClient: supabase });
  if (!profile) {
    return json({ ok: false, error: "No project selected" }, 400);
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id,title,description,repo_url,project_url,tags,profile_id")
    .eq("id", parsed.data.projectId)
    .eq("profile_id", profile.id)
    .single();

  if (error || !project) {
    return json({ ok: false, error: "No project selected" }, 404);
  }

  const title = parsed.data.title || project.title || "";
  const description = parsed.data.description ?? project.description ?? "";
  const repoUrl = parsed.data.repoUrl || project.repo_url || "";
  const projectUrl = parsed.data.projectUrl || project.project_url || "";
  const tags = parsed.data.tags?.length ? parsed.data.tags : Array.isArray(project.tags) ? project.tags : [];

  if (!title && !description && !repoUrl) {
    return json({ ok: false, error: "No project selected" }, 400);
  }

  const readme = await fetchGithubReadme(repoUrl);
  const technologies = extractTechnologies(readme, tags);
  const aiService = createAIService(supabase, user.id);
  let result;
  try {
    result = await aiService.runAI("improve_project_description", {
      projectId: project.id,
      project: {
        id: project.id,
        title,
        description,
        repoUrl,
        projectUrl,
        tags,
        readme,
        technologies,
      },
    });
  } catch (error) {
    return providerErrorJson(error);
  }
  const variants = parseVariants(result.content);

  if (!hasAnyVariant(variants)) {
    return json({ ok: false, error: "AI did not return a usable description." }, 502);
  }

  debugLog("AI", "project_description_generated", {
    ai_feature: "project_description",
    project_id: project.id,
    provider: result.provider,
    model: result.model || process.env.OPENROUTER_MODELS || process.env.OPENROUTER_MODEL || process.env.AI_PROVIDER || "unknown",
    fallback: Boolean(result.fallback),
    debugCode: result.debugCode,
  });

  return json({
    ok: true,
    projectId: project.id,
    variants,
    provider: result.provider,
    model: result.model || process.env.OPENROUTER_MODELS || process.env.OPENROUTER_MODEL || null,
    fallback: Boolean(result.fallback),
    fallbackMessage: result.fallbackMessage,
    debugCode: result.debugCode,
    readmeUsed: Boolean(readme),
    technologies,
  });
}
