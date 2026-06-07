import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/modules/auth";
import { GithubRateLimitError, fetchGithubUserRepos, fetchGithubRepo } from "@/lib/github-extractor";
import { debugLog } from "@/lib/perf";

type GithubImportResponse =
  | { ok: true; projects: Awaited<ReturnType<typeof fetchGithubUserRepos>> }
  | { ok: false; error: string };

function json(payload: GithubImportResponse, status = 200) {
  return NextResponse.json(payload, { status });
}

async function readJsonBody(req: Request): Promise<{ target?: unknown }> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "github_import_failed";
}

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser("api_route");
    if (!user) {
      console.warn("[GITHUB] github_import_failed", { reason: "not_authenticated" });
      return json({ ok: false, error: "not_authenticated" }, 401);
    }

    debugLog("GITHUB", "github_import_started", { user_id: user.id });

    const body = await readJsonBody(req);
    const { target } = body;
    const normalizedTarget = typeof target === "string" ? target.trim() : "";

    if (!normalizedTarget) {
      console.warn("[GITHUB] github_import_failed", { user_id: user.id, reason: "target_required" });
      return json({ ok: false, error: "target_required" }, 400);
    }

    const token = process.env.GITHUB_TOKEN;

    // Determine if it's a repo URL or a username
    // Valid URL: https://github.com/owner/repo or github.com/owner/repo
    const repoMatch = normalizedTarget.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/);
    
    if (repoMatch) {
      const owner = repoMatch[1];
      const repoName = repoMatch[2].replace(".git", "");
      debugLog("GITHUB", "github_import_repo_url", { user_id: user.id, repo_url: `https://github.com/${owner}/${repoName}` });
      const project = await fetchGithubRepo(owner, repoName, token);
      debugLog("GITHUB", "github_import_success", { user_id: user.id, project_count: 1 });
      return json({ ok: true, projects: [project] });
    } else {
      // Treat as username
      // Extract username from URL if they pasted a user URL like github.com/username
      const userMatch = normalizedTarget.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)/);
      const username = userMatch ? userMatch[1] : normalizedTarget;
      
      const projects = await fetchGithubUserRepos(username, token);
      debugLog("GITHUB", "github_import_success", { user_id: user.id, username, project_count: projects.length });
      return json({ ok: true, projects });
    }
  } catch (error: unknown) {
    if (error instanceof GithubRateLimitError) {
      console.warn("[GITHUB] github_import_failed", { reason: "github_rate_limited" });
      return json({ ok: false, error: "github_rate_limited" }, 429);
    }

    console.error("[GITHUB] github_import_failed", { error: safeErrorMessage(error) });
    return json({ ok: false, error: safeErrorMessage(error) }, 500);
  }
}
