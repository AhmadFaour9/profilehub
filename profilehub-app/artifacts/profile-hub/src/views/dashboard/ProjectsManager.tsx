"use client";

import { useLocale } from "@/lib/i18n/client";

import { useEffect, useState, type FormEvent } from "react";
import type { Project } from "@/modules/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Briefcase, Github, Loader2, Check, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectCard } from "@/components/profile/ProjectCard";
import { useToast } from "@/hooks/use-toast";
import { createProject, deleteProject, updateProject } from "@/app/dashboard/actions";

interface GithubProject {
  title: string;
  description: string;
  repo_url: string;
  project_url: string;
  tags: string[];
  image_url: string;
}

type ProjectFormState = {
  title: string;
  description: string;
  projectUrl: string;
  repoUrl: string;
  imageUrl: string;
  tags: string;
};

type DescriptionVariantKey = "improved" | "shorter" | "marketing" | "technical";

type DescriptionVariants = Record<DescriptionVariantKey, string>;

const DESCRIPTION_VARIANTS: Array<{ key: DescriptionVariantKey; label: string; description: string }> = [
  { key: "improved", label: "Improved", description: "Balanced portfolio description." },
  { key: "shorter", label: "Shorter", description: "Concise one-line version." },
  { key: "marketing", label: "Marketing", description: "Benefit-focused version." },
  { key: "technical", label: "Technical", description: "Implementation-focused version." },
];

const API_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Please sign in again before importing GitHub projects.",
  github_rate_limited: "GitHub rate limit reached. Try again later or configure a GitHub token.",
  target_required: "Enter a GitHub username or repository URL.",
  invalid_projects_payload: "No valid GitHub projects were selected.",
  profile_missing: "Could not load your profile before importing projects.",
};

const EMPTY_PROJECT_FORM: ProjectFormState = {
  title: "",
  description: "",
  projectUrl: "",
  repoUrl: "",
  imageUrl: "",
  tags: "",
};

function safeTextError(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
}

function errorMessageFromCode(error: unknown, fallback: string): string {
  if (typeof error === "string" && API_ERROR_MESSAGES[error]) return API_ERROR_MESSAGES[error];
  if (typeof error === "string" && error) return error;
  return fallback;
}

async function parseJsonApiResponse(response: Response, fallback: string): Promise<any> {
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const data = await response.json().catch(() => null);
      throw new Error(errorMessageFromCode(data?.error, fallback));
    }

    const text = safeTextError(await response.text().catch(() => ""));
    throw new Error(text || fallback);
  }

  if (!contentType.includes("application/json")) {
    const text = safeTextError(await response.text().catch(() => ""));
    throw new Error(text || "Server returned a non-JSON response.");
  }

  const data = await response.json();
  if (data?.ok === false) {
    throw new Error(errorMessageFromCode(data.error, fallback));
  }
  return data;
}

function projectUrl(project: Project): string {
  return project.projectUrl || project.url || "";
}

function formFromProject(project: Project): ProjectFormState {
  return {
    title: project.title || "",
    description: project.description || "",
    projectUrl: projectUrl(project),
    repoUrl: project.repoUrl || "",
    imageUrl: project.imageUrl || "",
    tags: (project.tags || []).join(", "),
  };
}

function normalizeTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeProjectFromRow(row: any, fallback?: Project): Project {
  return {
    id: row.id || fallback?.id || `project_${Date.now()}`,
    profileId: row.profileId || row.profile_id || fallback?.profileId,
    title: row.title || fallback?.title || "",
    description: row.description ?? fallback?.description ?? "",
    imageUrl: row.imageUrl ?? row.image_url ?? fallback?.imageUrl ?? "",
    projectUrl: row.projectUrl ?? row.project_url ?? fallback?.projectUrl ?? "",
    repoUrl: row.repoUrl ?? row.repo_url ?? fallback?.repoUrl ?? "",
    url: row.url ?? row.projectUrl ?? row.project_url ?? row.repoUrl ?? row.repo_url ?? fallback?.url ?? "",
    tags: row.tags || fallback?.tags || [],
    position: row.position ?? fallback?.position,
    order: row.order ?? row.position ?? fallback?.order,
    isFeatured: row.isFeatured ?? row.is_featured ?? fallback?.isFeatured ?? false,
    isActive: row.isActive ?? row.is_active ?? fallback?.isActive ?? true,
    createdAt: row.createdAt || row.created_at || fallback?.createdAt || new Date().toISOString(),
    updatedAt: row.updatedAt || row.updated_at || fallback?.updatedAt,
  };
}

export default function ProjectsManager({ projects = [] }: { projects?: Project[] }) {
  const { t } = useLocale();
  const [allProjects, setAllProjects] = useState<Project[]>(projects);
  const [githubTarget, setGithubTarget] = useState("");
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState("");
  const [githubResults, setGithubResults] = useState<GithubProject[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ProjectFormState>(EMPTY_PROJECT_FORM);
  const [createSaving, setCreateSaving] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<ProjectFormState>(EMPTY_PROJECT_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [aiProject, setAiProject] = useState<Project | null>(null);
  const [aiVariants, setAiVariants] = useState<DescriptionVariants | null>(null);
  const [aiProviderMessage, setAiProviderMessage] = useState("");
  const [aiProviderMessageType, setAiProviderMessageType] = useState<"live" | "fallback">("live");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAccepting, setAiAccepting] = useState<DescriptionVariantKey | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setAllProjects(projects);
  }, [projects]);

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
      const data = await parseJsonApiResponse(res, "Failed to fetch GitHub data");
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
      const data = await parseJsonApiResponse(res, "Failed to save projects");

      // Add imported projects to the local list
      const imported: Project[] = (data.saved || []).map((p: any, i: number) => ({
        id: p.id || `gh_${Date.now()}_${i}`,
        profileId: p.profile_id,
        title: p.title,
        description: p.description,
        imageUrl: p.image_url,
        projectUrl: p.project_url,
        repoUrl: p.repo_url,
        url: p.project_url || p.repo_url,
        tags: p.tags || [],
        isFeatured: false,
        isActive: true,
        position: p.position ?? allProjects.length + i,
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

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setEditForm(formFromProject(project));
  };

  const openCreateDialog = () => {
    setCreateForm(EMPTY_PROJECT_FORM);
    setCreateOpen(true);
  };

  const selectedProjectContext = (project: Project) => {
    const usesEditDraft = editingProject?.id === project.id;

    return {
      projectId: project.id,
      title: usesEditDraft ? editForm.title : project.title,
      description: usesEditDraft ? editForm.description : project.description || "",
      repoUrl: usesEditDraft ? editForm.repoUrl : project.repoUrl || "",
      projectUrl: usesEditDraft ? editForm.projectUrl : projectUrl(project),
      tags: usesEditDraft ? normalizeTags(editForm.tags) : project.tags || [],
    };
  };

  const handleImproveDescription = async (project: Project) => {
    setAiProject(project);
    setAiVariants(null);
    setAiProviderMessage("");
    setAiLoading(true);

    try {
      const response = await fetch("/api/ai/project-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedProjectContext(project)),
      });
      const data = await parseJsonApiResponse(response, "Could not improve project description.");

      setAiVariants(data.variants);
      if (data.fallback) {
        setAiProviderMessageType("fallback");
        setAiProviderMessage("Live AI unavailable, local fallback used.");
      } else if (data.model) {
        setAiProviderMessageType("live");
        setAiProviderMessage(`Live AI used: ${data.model}`);
      }
    } catch (error: any) {
      setAiProject(null);
      toast({
        title: "AI description failed",
        description: error?.message || "Could not improve project description.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptDescription = async (variant: DescriptionVariantKey) => {
    if (!aiProject || !aiVariants?.[variant]) return;

    const nextDescription = aiVariants[variant];
    setAiAccepting(variant);

    try {
      const result = await updateProject(aiProject.id, { description: nextDescription });

      if (!result.ok) {
        throw new Error(result.message || "Could not update project.");
      }

      const updated = normalizeProjectFromRow(result.data, { ...aiProject, description: nextDescription });
      setAllProjects((prev) => prev.map((project) => (project.id === updated.id ? updated : project)));

      if (editingProject?.id === updated.id) {
        setEditingProject(updated);
        setEditForm((prev) => ({ ...prev, description: updated.description || nextDescription }));
      }

      setAiProject(null);
      setAiVariants(null);
      toast({ title: "Description updated", description: "The selected AI description has been saved." });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Could not update project.",
        variant: "destructive",
      });
    } finally {
      setAiAccepting(null);
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProject) return;

    setEditSaving(true);
    try {
      const result = await updateProject(editingProject.id, {
        title: editForm.title,
        description: editForm.description,
        projectUrl: editForm.projectUrl,
        repoUrl: editForm.repoUrl,
        imageUrl: editForm.imageUrl,
        tags: normalizeTags(editForm.tags),
        isFeatured: editingProject.isFeatured ?? false,
        isActive: editingProject.isActive ?? true,
      });

      if (!result.ok) {
        throw new Error(result.message || "Could not update project.");
      }

      const updated = normalizeProjectFromRow(result.data, editingProject);
      setAllProjects((prev) => prev.map((project) => (project.id === editingProject.id ? updated : project)));
      setEditingProject(null);
      toast({ title: "Project updated", description: "Your project changes have been saved." });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Could not update project.",
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCreateSaving(true);
    try {
      const result = await createProject({
        title: createForm.title,
        description: createForm.description,
        projectUrl: createForm.projectUrl,
        repoUrl: createForm.repoUrl,
        imageUrl: createForm.imageUrl,
        tags: normalizeTags(createForm.tags),
        position: allProjects.length,
        isFeatured: false,
        isActive: true,
      });

      if (!result.ok) {
        throw new Error(result.message || "Could not create project.");
      }

      const created = normalizeProjectFromRow(result.data);
      setAllProjects((prev) => [...prev, created]);
      setCreateOpen(false);
      setCreateForm(EMPTY_PROJECT_FORM);
      toast({ title: "Project created", description: "Your project has been added." });
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error?.message || "Could not create project.",
        variant: "destructive",
      });
    } finally {
      setCreateSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;

    setDeleteSaving(true);
    try {
      const result = await deleteProject(deleteTarget.id);
      if (!result.ok) {
        throw new Error(result.message || "Could not delete project.");
      }

      setAllProjects((prev) => prev.filter((project) => project.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast({ title: "Project deleted", description: "The project has been removed." });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete project.",
        variant: "destructive",
      });
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">{t("projects.title")}</h1>
          <p className="text-muted-foreground mt-1">Showcase your best work.</p>
        </div>
        <Button data-testid="btn-add-project" onClick={openCreateDialog}>
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
          action={<Button onClick={openCreateDialog}><Plus className="w-4 h-4 mr-2" /> Add Project</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {allProjects.map((project) => (
            <div key={project.id} className="relative group">
              <ProjectCard project={project} theme={{ id: "default", buttonStyle: "rounded" }} />
              <div className="absolute top-4 right-4 z-10 flex flex-wrap justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleImproveDescription(project)}
                  disabled={aiLoading}
                >
                  {aiLoading && aiProject?.id === project.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Improve
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => openEditDialog(project)}>
                  Edit
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTarget(project)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>Title</span>
                <Input
                  value={createForm.title}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                  maxLength={100}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Tags</span>
                <Input
                  value={createForm.tags}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, tags: event.target.value }))}
                  placeholder="react, supabase, portfolio"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium block">
              <span>Description</span>
              <Textarea
                value={createForm.description}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                maxLength={800}
                rows={4}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>Project URL</span>
                <Input
                  value={createForm.projectUrl}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, projectUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Repository URL</span>
                <Input
                  value={createForm.repoUrl}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, repoUrl: event.target.value }))}
                  placeholder="https://github.com/owner/repo"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium block">
              <span>Image URL</span>
              <Input
                value={createForm.imageUrl}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                placeholder="https://..."
              />
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={createSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSaving}>
                {createSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingProject)} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>Title</span>
                <Input
                  value={editForm.title}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                  maxLength={100}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Tags</span>
                <Input
                  value={editForm.tags}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, tags: event.target.value }))}
                  placeholder="react, supabase, portfolio"
                />
              </label>
            </div>

            <div className="space-y-2 text-sm font-medium">
              <div className="flex items-center justify-between gap-3">
                <span>Description</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editingProject && handleImproveDescription(editingProject)}
                  disabled={!editingProject || aiLoading}
                >
                  {aiLoading && aiProject?.id === editingProject?.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Improve Description
                </Button>
              </div>
              <Textarea
                value={editForm.description}
                onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                maxLength={800}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>Project URL</span>
                <Input
                  value={editForm.projectUrl}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, projectUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Repository URL</span>
                <Input
                  value={editForm.repoUrl}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, repoUrl: event.target.value }))}
                  placeholder="https://github.com/owner/repo"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium block">
              <span>Image URL</span>
              <Input
                value={editForm.imageUrl}
                onChange={(event) => setEditForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                placeholder="https://..."
              />
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingProject(null)} disabled={editSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(aiProject)}
        onOpenChange={(open) => {
          if (!open && !aiLoading && !aiAccepting) {
            setAiProject(null);
            setAiVariants(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Improve Description{aiProject?.title ? `: ${aiProject.title}` : ""}</DialogTitle>
          </DialogHeader>

          {aiLoading ? (
            <div className="flex items-center gap-3 rounded-lg border p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Improving the selected project description...
            </div>
          ) : (
            <div className="space-y-4">
              {aiProviderMessage && (
                <div
                  className={
                    aiProviderMessageType === "fallback"
                      ? "rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200"
                      : "rounded-lg border border-emerald-300/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200"
                  }
                >
                  {aiProviderMessage}
                </div>
              )}

              {aiVariants && DESCRIPTION_VARIANTS.map((variant) => (
                <div key={variant.key} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{variant.label}</h3>
                      <p className="text-xs text-muted-foreground">{variant.description}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAcceptDescription(variant.key)}
                      disabled={Boolean(aiAccepting)}
                    >
                      {aiAccepting === variant.key && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Accept
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{aiVariants[variant.key]}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteTarget?.title ? `"${deleteTarget.title}"` : "this project"} from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSaving}
              onClick={(event) => {
                event.preventDefault();
                handleDeleteProject();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
