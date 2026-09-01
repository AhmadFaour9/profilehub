"use client";

import { usePathname } from "next/navigation";
import { Globe, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";
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
 * `variant="floating"` is reserved for simple authentication pages. Published
 * profiles place the compact control in their own header instead, so it never
 * looks like a permanently hovered button over the visitor's content.
 */
export function LanguageToggle({
  variant = "inline",
  className = "",
}: {
  variant?: "inline" | "floating" | "compact";
  className?: string;
}) {
  const { locale, setLocale, t } = useLocale();

  const positioning =
    variant === "floating" ? "fixed top-4 end-4 z-50" : "";
  const isCompact = variant === "compact";

  return (
    <div className={`${positioning} ${className}`.trim()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={isCompact
              ? "h-8 w-8 rounded-full p-0 text-foreground hover:bg-accent"
              : "gap-2 border bg-background/80 backdrop-blur"}
            aria-label={t("nav.language")}
            title={isCompact ? t("nav.language") : undefined}
            data-testid="language-toggle"
          >
            <Globe className="h-4 w-4" aria-hidden />
            {isCompact ? (
              <span className="sr-only">{t("nav.language")}</span>
            ) : (
              <span className="text-xs font-medium">{LOCALE_LABELS[locale]}</span>
            )}
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

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const isDark = resolvedTheme === "dark";
  const nextLabel = isDark ? t("nav.switchToLight") : t("nav.switchToDark");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-full text-foreground hover:bg-accent"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={nextLabel}
      title={nextLabel}
      data-testid="profile-theme-toggle"
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </Button>
  );
}

export function ProfileAppearanceControls() {
  return (
    <div
      className="absolute top-4 end-4 z-20 flex items-center gap-1 rounded-full border border-border/80 bg-background/85 p-1 shadow-lg backdrop-blur-md"
      data-testid="profile-appearance-controls"
    >
      <LanguageToggle variant="compact" />
      <ThemeToggle />
    </div>
  );
}

/**
 * Auth screens have no navigation of their own, so they retain a small floating
 * language selector. Public profiles carry theirs in ProfileHeader.
 */
export function GlobalLanguageToggle() {
  const pathname = usePathname();
  const authRoutes = ["/login", "/register", "/forgot-password", "/auth/update-password", "/auth/status"];

  return pathname && authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
    ? <LanguageToggle variant="floating" />
    : null;
}
