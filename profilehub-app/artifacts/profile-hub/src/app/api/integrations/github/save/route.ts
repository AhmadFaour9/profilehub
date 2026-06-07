import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getAuthenticatedUser } from "@/modules/auth";
import { getOrCreateProfile } from "@/lib/profile-data";
import { debugLog } from "@/lib/perf";

const optionalHttpUrlSchema = z.preprocess((value) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";

  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}, z.string());

const requiredHttpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  });

const githubProjectSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(800).optional().default(""),
  repo_url: requiredHttpUrlSchema,
  project_url: optionalHttpUrlSchema.optional().default(""),
  tags: z.array(z.string().trim().max(30)).max(12).optional().default([]),
  image_url: optionalHttpUrlSchema.optional().default(""),
});

const saveGithubProjectsSchema = z.object({
  projects: z.array(githubProjectSchema).min(1).max(20),
});

type SaveGithubProjectsResponse =
  | { ok: true; saved: unknown[] }
  | { ok: false; error: string };

function json(payload: SaveGithubProjectsResponse, status = 200) {
  return NextResponse.json(payload, { status });
}

async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "github_import_failed";
}

function githubSocialPreviewFromRepoUrl(repoUrl: string): string {
  try {
    const url = new URL(repoUrl);
    if (!url.hostname.endsWith("github.com")) return "";

    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return "";

    return `https://opengraph.githubassets.com/1/${owner}/${repo.replace(/\.git$/, "")}`;
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const { supabase: client, user } = await getAuthenticatedUser("api_route");
    if (!user) {
      console.warn("[GITHUB] github_import_failed", { reason: "not_authenticated", route: "save" });
      return json({ ok: false, error: "not_authenticated" }, 401);
    }

    debugLog("GITHUB", "github_import_started", { user_id: user.id, route: "save" });

    const parsed = saveGithubProjectsSchema.safeParse(await readJsonBody(req));
    if (!parsed.success) {
      console.warn("[GITHUB] github_import_failed", {
        user_id: user.id,
        route: "save",
        reason: "invalid_projects_payload",
      });
      return json({ ok: false, error: "invalid_projects_payload" }, 400);
    }

    const profile = await getOrCreateProfile(user, { source: "dashboard", authClient: client, allowFallbackProfile: true });
    if (!profile) {
      console.warn("[GITHUB] github_import_failed", { user_id: user.id, route: "save", reason: "profile_missing" });
      return json({ ok: false, error: "profile_missing" }, 400);
    }

    parsed.data.projects.forEach((project) => {
      debugLog("GITHUB", "github_import_repo_url", { user_id: user.id, repo_url: project.repo_url });
    });

    const { count } = await client
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id);

    const positionOffset = count || 0;
    const rows = parsed.data.projects.map((project, index) => ({
      profile_id: profile.id,
      title: project.title,
      description: project.description,
      image_url: project.image_url || githubSocialPreviewFromRepoUrl(project.repo_url),
      project_url: project.project_url,
      repo_url: project.repo_url,
      tags: project.tags,
      position: positionOffset + index,
      is_featured: false,
      is_active: true,
    }));

    const { data, error } = await client.from("projects").insert(rows).select("*");
    if (error) {
      console.error("[GITHUB] github_import_failed", {
        user_id: user.id,
        route: "save",
        code: error.code,
        error: error.message,
      });
      return json({ ok: false, error: error.message }, 500);
    }

    revalidatePath("/dashboard/projects");
    revalidatePath(`/${profile.username}`);
    revalidateTag(`profile:${profile.username}`, "max");

    debugLog("GITHUB", "github_import_success", {
      user_id: user.id,
      route: "save",
      saved_count: data?.length || 0,
    });

    return json({ ok: true, saved: data || [] });
  } catch (error: unknown) {
    console.error("[GITHUB] github_import_failed", { route: "save", error: safeErrorMessage(error) });
    return json({ ok: false, error: safeErrorMessage(error) }, 500);
  }
}
