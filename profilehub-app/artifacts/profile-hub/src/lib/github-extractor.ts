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

type ReadmeImageCandidate = {
  alt: string;
  src: string;
  resolvedUrl: string;
  sourceText: string;
  index: number;
};

const PREFERRED_IMAGE_HINTS = ["screenshot", "preview", "demo", "cover", "app", "ui", "dashboard"];
const TINY_IMAGE_HINTS = ["icon", "logo", "favicon", "avatar", "mark"];
const LARGE_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeRepoPath(path: string): string {
  const stack: string[] = [];
  path.split("/").forEach((segment) => {
    if (!segment || segment === ".") return;
    if (segment === "..") {
      stack.pop();
      return;
    }
    stack.push(segment);
  });
  return stack.join("/");
}

function cleanImageSource(src: string): string {
  return decodeHtmlEntities(src.trim())
    .replace(/^<|>$/g, "")
    .replace(/^["']|["']$/g, "")
    .split(/\s+/)[0];
}

function resolveImageUrl(repoFullName: string, defaultBranch: string, imgUrl: string, readmePath: string = "README.md"): string {
  const src = cleanImageSource(imgUrl);
  if (!src || src.startsWith("data:")) return "";

  const [owner, repoName] = repoFullName.split("/");

  try {
    const normalizedSrc = src.startsWith("//") ? `https:${src}` : src;
    const url = new URL(normalizedSrc);

    if (url.hostname === "github.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === owner && parts[1] === repoName && (parts[2] === "blob" || parts[2] === "raw") && parts.length > 4) {
        return `https://raw.githubusercontent.com/${owner}/${repoName}/${parts.slice(3).join("/")}${url.search}`;
      }
    }

    return url.toString();
  } catch {
    const cleanPath = src.replace(/^\.\//, "").replace(/^\//, "");
    const readmeDir = readmePath.split("/").slice(0, -1).join("/");
    const resolvedPath = normalizeRepoPath(src.startsWith("/") ? cleanPath : [readmeDir, cleanPath].filter(Boolean).join("/"));
    return `https://raw.githubusercontent.com/${repoFullName}/${defaultBranch}/${resolvedPath}`;
  }
}

function imageExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return LARGE_IMAGE_EXTENSIONS.find((extension) => pathname.endsWith(extension)) || (pathname.endsWith(".gif") ? ".gif" : "");
  } catch {
    const lower = url.toLowerCase();
    return LARGE_IMAGE_EXTENSIONS.find((extension) => lower.includes(extension)) || (lower.includes(".gif") ? ".gif" : "");
  }
}

function isBadgeImage(candidateText: string): boolean {
  const lower = candidateText.toLowerCase();
  return (
    lower.includes("shields.io") ||
    lower.includes("img.shields.io") ||
    lower.includes("badge.fury.io") ||
    lower.includes("badgen.net") ||
    lower.includes("badge") ||
    lower.includes("npm version") ||
    lower.includes("build status") ||
    (lower.includes("license") && (lower.includes(".svg") || lower.includes("shield")))
  );
}

function scoreReadmeImage(candidate: ReadmeImageCandidate): number {
  const lowerAlt = candidate.alt.toLowerCase();
  const lowerPath = `${candidate.src} ${candidate.resolvedUrl}`.toLowerCase();
  const combined = `${lowerAlt} ${lowerPath} ${candidate.sourceText.toLowerCase()}`;
  if (!candidate.resolvedUrl || isBadgeImage(combined)) return Number.NEGATIVE_INFINITY;

  let score = 0;
  PREFERRED_IMAGE_HINTS.forEach((hint) => {
    if (lowerAlt.includes(hint)) score += 80;
    if (lowerPath.includes(hint)) score += 50;
  });

  const extension = imageExtension(candidate.resolvedUrl);
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) score += 25;
  if (extension === ".gif") score += 8;
  if (lowerPath.includes(".svg")) score -= 35;

  const hasPreferredHint = PREFERRED_IMAGE_HINTS.some((hint) => combined.includes(hint));
  if (TINY_IMAGE_HINTS.some((hint) => combined.includes(hint))) {
    score -= hasPreferredHint ? 8 : 45;
  }

  return score - candidate.index;
}

function extractMarkdownImageCandidates(content: string, repoFullName: string, defaultBranch: string, readmePath: string): ReadmeImageCandidate[] {
  const candidates: ReadmeImageCandidate[] = [];
  const markdownRegex = /!\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = markdownRegex.exec(content))) {
    const alt = decodeHtmlEntities(match[1] || "");
    const src = match[2] || "";
    candidates.push({
      alt,
      src,
      resolvedUrl: resolveImageUrl(repoFullName, defaultBranch, src, readmePath),
      sourceText: match[0],
      index: candidates.length,
    });
  }

  return candidates;
}

function extractHtmlImageCandidates(content: string, repoFullName: string, defaultBranch: string, readmePath: string): ReadmeImageCandidate[] {
  const candidates: ReadmeImageCandidate[] = [];
  const htmlRegex = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = htmlRegex.exec(content))) {
    const tag = match[0];
    const src = /src\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] || "";
    if (!src) continue;

    candidates.push({
      alt: decodeHtmlEntities(/alt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] || ""),
      src,
      resolvedUrl: resolveImageUrl(repoFullName, defaultBranch, src, readmePath),
      sourceText: tag,
      index: candidates.length + 100,
    });
  }

  return candidates;
}

function selectBestReadmeImage(candidates: ReadmeImageCandidate[]): string {
  const ranked = candidates
    .map((candidate) => ({ candidate, score: scoreReadmeImage(candidate) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.candidate.resolvedUrl || "";
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
    const readmePath = typeof data.path === "string" ? data.path : "README.md";
    return selectBestReadmeImage([
      ...extractMarkdownImageCandidates(content, repoFullName, defaultBranch, readmePath),
      ...extractHtmlImageCandidates(content, repoFullName, defaultBranch, readmePath),
    ]);
  } catch (error) {
    console.warn(`Failed to extract README for ${repoFullName}`);
  }
  return "";
}

function githubSocialPreviewImage(repoFullName: string): string {
  return repoFullName ? `https://opengraph.githubassets.com/1/${repoFullName}` : "";
}

function generatedPlaceholderImage(repoName: string): string {
  return `https://placehold.co/1200x675/111827/ffffff.png?text=${encodeURIComponent(repoName || "Project")}`;
}

async function extractHomepageOgImage(homepage: string | null | undefined): Promise<string> {
  if (!homepage) return "";

  try {
    const homepageUrl = new URL(homepage);
    if (homepageUrl.protocol !== "http:" && homepageUrl.protocol !== "https:") return "";

    const res = await fetch(homepageUrl.toString(), {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "";

    const contentType = res.headers.get("content-type") || "";
    if (contentType && !contentType.includes("text/html")) return "";

    const html = await res.text();
    const match =
      /<meta\s+[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/i.exec(html) ||
      /<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/i.exec(html);
    const imageUrl = match?.[1] ? new URL(decodeHtmlEntities(match[1]), homepageUrl).toString() : "";

    return imageUrl && !isBadgeImage(imageUrl) ? imageUrl : "";
  } catch {
    return "";
  }
}

async function mapToProject(repo: any, readmeImageUrl: string): Promise<GithubProject> {
  const socialPreviewImage = githubSocialPreviewImage(repo.full_name);
  const homepageOgImage = readmeImageUrl || socialPreviewImage ? "" : await extractHomepageOgImage(repo.homepage);

  return {
    title: repo.name,
    description: repo.description || "",
    repo_url: repo.html_url,
    project_url: repo.homepage || "",
    tags: repo.topics || (repo.language ? [repo.language] : []),
    image_url: readmeImageUrl || socialPreviewImage || homepageOgImage || generatedPlaceholderImage(repo.name),
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
    projects.push(await mapToProject(repo, readmeImage));
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
