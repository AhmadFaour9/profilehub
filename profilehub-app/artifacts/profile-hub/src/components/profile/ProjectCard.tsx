"use client";

import { useEffect, useMemo, useState } from "react";
import { Project, ProfileTheme } from "@/modules/shared";
import { ArrowUpRight, ChevronDown, ImageIcon } from "lucide-react";
import { useLocale } from "@/lib/i18n/client";

function githubSocialPreviewFromRepoUrl(repoUrl: string | null | undefined): string {
  if (!repoUrl) return "";

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

function safeImageHost(imageUrl: string): string | null {
  try {
    return new URL(imageUrl).hostname;
  } catch {
    return null;
  }
}

/**
 * `compact` drops the cover image and the category line. It is for cards listed
 * under a category heading, where a column of title cards would bury the text.
 */
export function ProjectCard({
  project,
  theme,
  variant = "default",
}: {
  project: Project;
  theme?: ProfileTheme;
  variant?: "default" | "compact";
}) {
  const { t } = useLocale();
  const compact = variant === "compact";
  const isRounded = theme?.buttonStyle === "rounded";
  const isPill = theme?.buttonStyle === "pill";
  const radiusClass = isPill ? "rounded-[2rem]" : isRounded ? "rounded-xl" : "rounded-none";
  const imageCandidates = useMemo(() => {
    const candidates = [project.imageUrl?.trim(), githubSocialPreviewFromRepoUrl(project.repoUrl)].filter(Boolean) as string[];
    return Array.from(new Set(candidates));
  }, [project.imageUrl, project.repoUrl]);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageSrc = imageCandidates[imageIndex] || "";

  useEffect(() => {
    setImageIndex(0);
    setImageLoaded(false);
  }, [imageCandidates.join("|")]);

  const showImage = Boolean(imageSrc);
  const category = compact ? "" : project.category?.trim();
  const status = project.status?.trim();
  const features = project.features ?? [];
  const metrics = project.metrics ?? [];
  const Title = compact ? "h4" : "h3";

  const handleImageError = () => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[PROJECT] image_load_failed", {
        project_id: project.id,
        image_host: safeImageHost(imageSrc),
        fallback_available: imageIndex < imageCandidates.length - 1,
      });
    }
    setImageLoaded(false);
    setImageIndex((current) => current + 1);
  };

  return (
    <article
      id={`project-${project.id}`}
      className={`group relative min-w-0 scroll-mt-8 p-4 bg-card border border-card-border target:ring-2 target:ring-primary target:ring-offset-2 ${project.url ? "hover-elevate" : ""} ${radiusClass}`}
      data-testid={`project-${project.id}`}
    >
      {!compact && (
        <div className={`relative mb-4 aspect-video w-full overflow-hidden bg-muted ${isPill ? 'rounded-[1.5rem]' : isRounded ? 'rounded-lg' : 'rounded-none'}`}>
          {showImage ? (
            <>
              {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
              <img
                src={imageSrc}
                alt={project.title}
                className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                onLoad={() => setImageLoaded(true)}
                onError={handleImageError}
              />
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/70 px-4 text-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <span className="text-xs font-medium line-clamp-1">{project.title}</span>
            </div>
          )}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {(category || status) && (
            <p className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {category && <span className="font-semibold uppercase tracking-[0.14em]">{category}</span>}
              {status && <span className="rounded-full border px-2 py-0.5">{status}</span>}
            </p>
          )}
          <Title className={`${compact ? "text-base" : "text-lg"} font-medium text-foreground break-words group-hover:text-primary transition-colors`}>
            {project.url ? (
              // Stretched over the card, so the whole card stays one click
              // target without wrapping the features disclosure in a link.
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0">
                {project.title}
              </a>
            ) : (
              project.title
            )}
          </Title>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{project.description}</p>
          )}
          {metrics.length > 0 && (
            <ul className="flex flex-wrap gap-2 mt-3">
              {metrics.map((metric, index) => (
                <li key={`${index}-${metric}`} className="px-2 py-1 text-xs font-medium text-foreground border border-primary/30 bg-primary/5 rounded-md">
                  {metric}
                </li>
              ))}
            </ul>
          )}
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {project.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {project.url && (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        )}
      </div>
      {features.length > 0 && (
        // Above the stretched link, or opening it would follow the link instead.
        <details className="group/features relative z-10 mt-3 border-t pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span>
              {t("public.keyFeatures")} <span className="tabular-nums">({features.length})</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open/features:rotate-180" aria-hidden />
          </summary>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {features.map((feature, index) => (
              <li key={`${index}-${feature}`} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/60" aria-hidden />
                <span className="min-w-0 break-words">{feature}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
