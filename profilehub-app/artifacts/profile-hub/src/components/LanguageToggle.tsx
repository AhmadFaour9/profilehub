"use client";

import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n";

/**
 * Language switcher for pages outside the dashboard.
 *
 * `variant="floating"` pins it to the top corner of a page that has no chrome
 * of its own, which is every public and auth page. It sits on the side the
 * current direction calls "start", so it never covers content.
 */
export function LanguageToggle({
  variant = "inline",
  className = "",
}: {
  variant?: "inline" | "floating";
  className?: string;
}) {
  const { locale, setLocale, t } = useLocale();

  const positioning =
    variant === "floating" ? "fixed top-4 end-4 z-50" : "";

  return (
    <div className={`${positioning} ${className}`.trim()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 bg-background/80 backdrop-blur border"
            aria-label={t("nav.language")}
            data-testid="language-toggle"
          >
            <Globe className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium">{LOCALE_LABELS[locale]}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {LOCALES.map((option) => (
            <DropdownMenuItem
              key={option}
              onClick={() => setLocale(option)}
              className={option === locale ? "font-semibold" : ""}
              data-testid={`language-option-${option}`}
            >
              {LOCALE_LABELS[option]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Mounts the floating switcher on every page that has no chrome of its own.
 *
 * The dashboard already carries one in its top bar, so it is skipped there to
 * avoid two controls on screen. Doing this in one place means a page added
 * later gets the switcher without anyone remembering to wire it up.
 */
export function GlobalLanguageToggle() {
  const pathname = usePathname();

  // The dashboard carries its own switcher in the top bar, and /account/preview
  // is the public page rendered inside the dashboard's phone frame - a floating
  // control there would appear to be part of the visitor's profile.
  if (pathname?.startsWith("/dashboard")) return null;
  if (pathname?.startsWith("/account/preview")) return null;

  return <LanguageToggle variant="floating" />;
}
