import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/modules/auth";
import { fetchGithubUserRepos, fetchGithubRepo } from "@/lib/github-extractor";

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser("api_route");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { target } = body;

    if (!target) {
      return NextResponse.json({ error: "Target is required" }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;

    // Determine if it's a repo URL or a username
    // Valid URL: https://github.com/owner/repo or github.com/owner/repo
    const repoMatch = target.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/);
    
    if (repoMatch) {
      const owner = repoMatch[1];
      const repoName = repoMatch[2].replace(".git", "");
      const project = await fetchGithubRepo(owner, repoName, token);
      return NextResponse.json({ projects: [project] });
    } else {
      // Treat as username
      // Extract username from URL if they pasted a user URL like github.com/username
      const userMatch = target.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)/);
      const username = userMatch ? userMatch[1] : target;
      
      const projects = await fetchGithubUserRepos(username, token);
      return NextResponse.json({ projects });
    }
  } catch (error: any) {
    console.error("[GITHUB_IMPORT_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
