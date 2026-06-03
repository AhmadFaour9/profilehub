"use client";

import { useEffect, useMemo, useState } from "react";
import { Project, ProfileTheme } from "@/modules/shared";
import { ArrowUpRight, ImageIcon } from "lucide-react";

export function ProjectCard({ project, theme }: { project: Project; theme?: ProfileTheme }) {
  const isRounded = theme?.buttonStyle === "rounded";
  const isPill = theme?.buttonStyle === "pill";
  const radiusClass = isPill ? "rounded-[2rem]" : isRounded ? "rounded-xl" : "rounded-none";
  const imageSrc = useMemo(() => project.imageUrl?.trim() || "", [project.imageUrl]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [imageSrc]);

  const showImage = Boolean(imageSrc && !imageFailed);

  const Content = () => (
    <>
      <div className={`relative aspect-video w-full overflow-hidden bg-muted ${isPill ? 'rounded-[1.5rem]' : isRounded ? 'rounded-lg' : 'rounded-none'}`}>
        {showImage ? (
          <>
            {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
            <img 
              src={imageSrc} 
              alt={project.title} 
              className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
            />
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/70 px-4 text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs font-medium line-clamp-1">{project.title}</span>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-foreground group-hover:text-primary transition-colors">{project.title}</h3>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
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
    </>
  );

  return project.url ? (
    <a 
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block p-4 bg-card border border-card-border hover-elevate ${radiusClass}`}
      data-testid={`project-${project.id}`}
    >
      <Content />
    </a>
  ) : (
    <div className={`group block p-4 bg-card border border-card-border ${radiusClass}`} data-testid={`project-${project.id}`}>
      <Content />
    </div>
  );
}
