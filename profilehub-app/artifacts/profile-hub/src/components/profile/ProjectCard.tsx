import { Project, ProfileTheme } from "@/modules/shared";
import { ArrowUpRight } from "lucide-react";

export function ProjectCard({ project, theme }: { project: Project; theme?: ProfileTheme }) {
  const isRounded = theme?.buttonStyle === "rounded";
  const isPill = theme?.buttonStyle === "pill";
  const radiusClass = isPill ? "rounded-[2rem]" : isRounded ? "rounded-xl" : "rounded-none";

  const Content = () => (
    <>
      <div className={`aspect-video w-full overflow-hidden bg-muted ${isPill ? 'rounded-[1.5rem]' : isRounded ? 'rounded-lg' : 'rounded-none'}`}>
        {project.imageUrl && (
          <img 
            src={project.imageUrl} 
            alt={project.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
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
