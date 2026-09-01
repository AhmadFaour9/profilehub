import { Link, ProfileTheme } from "@/modules/shared";
import { ExternalLink, Link2 } from "lucide-react";
import type { CSSProperties } from "react";

export function SmartLinkCard({ link, theme }: { link: Link; theme?: ProfileTheme }) {
  const isRounded = theme?.buttonStyle === "rounded";
  const isPill = theme?.buttonStyle === "pill";
  const radiusClass = isPill ? "rounded-full" : isRounded ? "rounded-xl" : "rounded-none";
  const href = `/go/${link.id}`;
  const imageUrl = link.thumbnailUrl || link.imageUrl;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`profile-link-card @container group flex items-center p-4 bg-card border border-card-border ${radiusClass}`}
      style={theme?.primaryColor ? ({ "--profile-link-glow": theme.primaryColor } as CSSProperties) : undefined}
      data-testid={`link-${link.id}`}
    >
      <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-muted mr-4 grid place-items-center text-muted-foreground">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : link.icon ? (
          <span className="px-1 text-center text-[10px] font-semibold uppercase leading-tight">{link.icon}</span>
        ) : (
          <Link2 className="h-5 w-5" />
        )}
      </div>
      
      <div className="flex-1 min-w-0 pr-4 text-center @sm:text-left">
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
