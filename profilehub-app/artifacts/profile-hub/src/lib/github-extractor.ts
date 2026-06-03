export interface GithubProject {
  title: string;
  description: string;
  repo_url: string;
  project_url: string;
  tags: string[];
  image_url: string;
}

export class GithubRateLimitError extends Error {
  constructor() {
    super("GitHub API rate limit reached.");
    this.name = "GithubRateLimitError";
  }
}

function isGithubRateLimited(response: Response): boolean {
  return response.status === 429 || (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
}

async function throwGithubFetchError(response: Response, fallback: string): Promise<never> {
  if (isGithubRateLimited(response)) {
    throw new GithubRateLimitError();
  }

  throw new Error(fallback);
}

function resolveImageUrl(repoFullName: string, defaultBranch: string, imgUrl: string): string {
  if (imgUrl.startsWith("http://") || imgUrl.startsWith("https://")) {
    // Ignore shields.io badges
    if (imgUrl.includes("shields.io") || imgUrl.includes("badge")) {
      return "";
    }
    return imgUrl;
  }
  // Convert relative paths to raw github user content URLs
  const cleanPath = imgUrl.replace(/^\.\//, "").replace(/^\//, "");
  return `https://raw.githubusercontent.com/${repoFullName}/${defaultBranch}/${cleanPath}`;
}

async function extractReadmeImage(repoFullName: string, defaultBranch: string, token?: string): Promise<string> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`https://api.github.com/repos/${repoFullName}/readme`, { headers });
    if (!res.ok) {
      if (isGithubRateLimited(res)) throw new GithubRateLimitError();
      return "";
    }

    const data = await res.json();
    if (data.encoding !== "base64" || !data.content) return "";

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    
    // Simple regex to find markdown images: ![alt](url)
    // Matches first one. We can also look for HTML <img src="...">
    const markdownRegex = /!\[[^\]]*\]\(([^)]+)\)/;
    const match = markdownRegex.exec(content);
    if (match && match[1]) {
      return resolveImageUrl(repoFullName, defaultBranch, match[1].split(" ")[0]);
    }

    const htmlRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const htmlMatch = htmlRegex.exec(content);
    if (htmlMatch && htmlMatch[1]) {
      return resolveImageUrl(repoFullName, defaultBranch, htmlMatch[1]);
    }
  } catch (error) {
    console.warn(`Failed to extract README for ${repoFullName}`);
  }
  return "";
}

function mapToProject(repo: any, readmeImageUrl: string): GithubProject {
  return {
    title: repo.name,
    description: repo.description || "",
    repo_url: repo.html_url,
    project_url: repo.homepage || "",
    tags: repo.topics || (repo.language ? [repo.language] : []),
    image_url: readmeImageUrl || "",
  };
}

export async function fetchGithubUserRepos(username: string, token?: string): Promise<GithubProject[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=15`, { headers });
  if (!res.ok) {
    await throwGithubFetchError(res, `Failed to fetch repos for user ${username}`);
  }
  const repos = await res.json();
  
  // Filter out forks and non-public
  const validRepos = repos.filter((r: any) => !r.fork && !r.private);
  
  const projects: GithubProject[] = [];
  for (const repo of validRepos) {
    const readmeImage = await extractReadmeImage(repo.full_name, repo.default_branch, token);
    projects.push(mapToProject(repo, readmeImage));
  }
  return projects;
}

export async function fetchGithubRepo(owner: string, repoName: string, token?: string): Promise<GithubProject> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers });
  if (!res.ok) {
    await throwGithubFetchError(res, `Failed to fetch repo ${owner}/${repoName}`);
  }
  const repo = await res.json();
  if (repo.private) {
    throw new Error("Private repos are not supported");
  }

  const readmeImage = await extractReadmeImage(repo.full_name, repo.default_branch, token);
  return mapToProject(repo, readmeImage);
}
