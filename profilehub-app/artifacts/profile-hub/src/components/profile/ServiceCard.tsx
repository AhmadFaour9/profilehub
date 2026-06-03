import { Service, ProfileTheme } from "@/modules/shared";
import { Button } from "@/components/ui/button";
import { Box } from "lucide-react";

export function ServiceCard({ service, theme }: { service: Service; theme?: ProfileTheme }) {
  const isRounded = theme?.buttonStyle === "rounded";
  const isPill = theme?.buttonStyle === "pill";
  const radiusClass = isPill ? "rounded-3xl" : isRounded ? "rounded-xl" : "rounded-none";
  const priceText = service.priceLabel || service.price;

  return (
    <div className={`p-6 bg-card border border-card-border ${radiusClass}`} data-testid={`service-${service.id}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div className="flex gap-4 min-w-0">
          {(service.imageUrl || service.icon) && (
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted grid place-items-center">
              {service.imageUrl ? (
                <img src={service.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-muted-foreground uppercase">{service.icon}</span>
              )}
            </div>
          )}
          {!service.imageUrl && !service.icon && (
            <div className="h-12 w-12 shrink-0 rounded-lg bg-muted grid place-items-center text-muted-foreground">
              <Box className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-lg font-medium text-foreground">{service.title}</h3>
            {service.description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">{service.description}</p>
            )}
          </div>
        </div>
        
        <div className="text-left sm:text-right shrink-0">
          {priceText && (
            <div className="text-lg font-medium text-foreground">
              {priceText}
            </div>
          )}
          {service.duration && (
            <div className="text-sm text-muted-foreground">{service.duration}</div>
          )}
        </div>
      </div>

      {service.ctaUrl && (
        <Button 
          asChild 
          className={`w-full sm:w-auto mt-2 ${isPill ? 'rounded-full' : isRounded ? 'rounded-md' : 'rounded-none'}`}
        >
          <a href={service.ctaUrl} target="_blank" rel="noopener noreferrer">
            {service.ctaLabel || "Inquire"}
          </a>
        </Button>
      )}
    </div>
  );
}
