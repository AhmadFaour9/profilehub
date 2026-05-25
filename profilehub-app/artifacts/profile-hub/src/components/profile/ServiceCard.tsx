import { Service, ProfileTheme } from "@/modules/shared";
import { Button } from "@/components/ui/button";

export function ServiceCard({ service, theme }: { service: Service; theme?: ProfileTheme }) {
  const isRounded = theme?.buttonStyle === "rounded";
  const isPill = theme?.buttonStyle === "pill";
  const radiusClass = isPill ? "rounded-3xl" : isRounded ? "rounded-xl" : "rounded-none";

  return (
    <div className={`p-6 bg-card border border-card-border ${radiusClass}`} data-testid={`service-${service.id}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">{service.title}</h3>
          {service.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">{service.description}</p>
          )}
        </div>
        
        <div className="text-left sm:text-right shrink-0">
          {service.price && (
            <div className="text-lg font-medium text-foreground">
              {service.currency === "USD" ? "$" : service.currency} {service.price}
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
