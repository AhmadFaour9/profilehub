"use client";

import { useState } from "react";
import type { Project } from "@/modules/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Briefcase, Github, Loader2, Check, X } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectCard } from "@/components/profile/ProjectCard";
import { useToast } from "@/hooks/use-toast";

interface GithubProject {
  title: string;
  description: string;
  repo_url: string;
  project_url: string;
  tags: string[];
  image_url: string;
}

export default function ProjectsManager({ projects = [] }: { projects?: Project[] }) {
  const [allProjects, setAllProjects] = useState<Project[]>(projects);
  const [githubTarget, setGithubTarget] = useState("");
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState("");
  const [githubResults, setGithubResults] = useState<GithubProject[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleGithubFetch = async () => {
    if (!githubTarget.trim()) return;
    setGithubLoading(true);
    setGithubError("");
    setGithubResults([]);
    setSelectedRepos(new Set());

    try {
      const res = await fetch("/api/integrations/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: githubTarget.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch GitHub data");
      if (!data.projects || data.projects.length === 0) {
        setGithubError("No public repositories found.");
        return;
      }
      setGithubResults(data.projects);
      // Auto-select all
      setSelectedRepos(new Set(data.projects.map((p: GithubProject) => p.repo_url)));
    } catch (err: any) {
      setGithubError(err.message || "Something went wrong.");
    } finally {
      setGithubLoading(false);
    }
  };

  const toggleRepo = (repoUrl: string) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoUrl)) next.delete(repoUrl);
      else next.add(repoUrl);
      return next;
    });
  };

  const handleImportSelected = async () => {
    const toImport = githubResults.filter((r) => selectedRepos.has(r.repo_url));
    if (toImport.length === 0) return;
    setSaving(true);

    try {
      const res = await fetch("/api/integrations/github/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: toImport }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save projects");

      // Add imported projects to the local list
      const imported: Project[] = (data.saved || []).map((p: any, i: number) => ({
        id: p.id || `gh_${Date.now()}_${i}`,
        title: p.title,
        description: p.description,
        imageUrl: p.image_url,
        url: p.project_url || p.repo_url,
        tags: p.tags || [],
        isFeatured: false,
        order: allProjects.length + i,
        createdAt: new Date().toISOString(),
      }));

      setAllProjects((prev) => [...prev, ...imported]);
      setGithubResults([]);
      setSelectedRepos(new Set());
      setGithubTarget("");

      toast({
        title: "Projects imported",
        description: `${imported.length} project(s) imported from GitHub.`,
      });
    } catch (err: any) {
      toast({
        title: "Import failed",
        description: err.message || "Could not save projects.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Projects</h1>
          <p className="text-muted-foreground mt-1">Showcase your best work.</p>
        </div>
        <Button data-testid="btn-add-project">
          <Plus className="w-4 h-4 mr-2" /> Add Project
        </Button>
      </div>

      {/* GitHub Import Section */}
      <div className="p-6 border rounded-xl bg-card space-y-4">
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-medium">Import from GitHub</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste a GitHub username or repository URL to import projects automatically.
        </p>
        <div className="flex gap-3">
          <Input
            value={githubTarget}
            onChange={(e) => setGithubTarget(e.target.value)}
            placeholder="e.g. AhmadFaour9 or https://github.com/user/repo"
            data-testid="input-github-target"
            onKeyDown={(e) => e.key === "Enter" && handleGithubFetch()}
          />
          <Button
            onClick={handleGithubFetch}
            disabled={githubLoading || !githubTarget.trim()}
            data-testid="btn-github-import"
          >
            {githubLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Github className="w-4 h-4 mr-2" />
            )}
            {githubLoading ? "Fetching..." : "Import"}
          </Button>
        </div>

        {githubError && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {githubError}
          </div>
        )}

        {githubResults.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{githubResults.length} repositories found</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedRepos(new Set(githubResults.map(r => r.repo_url)))}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedRepos(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid gap-2 max-h-80 overflow-y-auto">
              {githubResults.map((repo) => (
                <button
                  key={repo.repo_url}
                  type="button"
                  onClick={() => toggleRepo(repo.repo_url)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selectedRepos.has(repo.repo_url)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                    selectedRepos.has(repo.repo_url) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                  }`}>
                    {selectedRepos.has(repo.repo_url) && <Check className="w-3 h-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{repo.title}</p>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{repo.description}</p>
                    )}
                    {repo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {repo.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <Button
              onClick={handleImportSelected}
              disabled={selectedRepos.size === 0 || saving}
              className="w-full"
              data-testid="btn-save-github-projects"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {saving ? "Saving..." : `Import ${selectedRepos.size} selected`}
            </Button>
          </div>
        )}
      </div>

      {/* Projects Grid */}
      {allProjects.length === 0 ? (
        <EmptyState 
          icon={<Briefcase className="w-6 h-6" />}
          title="No projects yet"
          description="Add your first project to showcase your work to visitors."
          action={<Button><Plus className="w-4 h-4 mr-2" /> Add Project</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {allProjects.map((project) => (
            <div key={project.id} className="relative group">
              <ProjectCard project={project} theme={{ id: "default", buttonStyle: "rounded" }} />
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="secondary">Edit</Button>
                <Button size="sm" variant="destructive">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
