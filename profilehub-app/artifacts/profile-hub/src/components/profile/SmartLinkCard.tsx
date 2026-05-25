import { Link, ProfileTheme } from "@/modules/shared";
import { ExternalLink } from "lucide-react";

export function SmartLinkCard({ link, theme }: { link: Link; theme?: ProfileTheme }) {
  const isRounded = theme?.buttonStyle === "rounded";
  const isPill = theme?.buttonStyle === "pill";
  const radiusClass = isPill ? "rounded-full" : isRounded ? "rounded-xl" : "rounded-none";
  const href = `/api/links/${link.id}/click?to=${encodeURIComponent(link.url)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center p-4 bg-card hover:bg-accent border border-card-border transition-all ${radiusClass} hover-elevate`}
      style={theme?.primaryColor ? { '--hover-bg': theme.primaryColor } as any : {}}
      data-testid={`link-${link.id}`}
    >
      {link.thumbnailUrl && (
        <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-muted mr-4">
          <img src={link.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      
      <div className="flex-1 min-w-0 pr-4 text-center sm:text-left">
        <h3 className="text-base font-medium text-card-foreground truncate">{link.title}</h3>
        {link.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{link.description}</p>
        )}
      </div>
      
      <div className="w-8 shrink-0 flex justify-end opacity-50 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-5 h-5" />
      </div>
    </a>
  );
}
