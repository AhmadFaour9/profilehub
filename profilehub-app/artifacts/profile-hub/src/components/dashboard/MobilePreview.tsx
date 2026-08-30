"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/client";
import type { GalleryItem, Link, Profile, Project, Service } from "@/modules/shared";

/**
 * Phone preview of the real public profile.
 *
 * This used to rebuild the page by hand from the same data, which guaranteed
 * drift: it had its own section order, its own empty states, and never gained
 * the skills section or the footer. Worse, Tailwind breakpoints measure the
 * viewport, so inside a 320px div on a desktop screen every `sm:` and `md:`
 * rule still matched and cards laid themselves out as if they had the full
 * width - the opposite of what a phone shows.
 *
 * An iframe has its own viewport, so /account/preview renders exactly what a
 * phone renders, from the same component as the live page. There is only one
 * rendering of the profile to keep correct.
 *
 * The trade-off is that an iframe shows saved state, not the unsaved form
 * values the editor holds. That is stated in the caption rather than hidden,
 * and the frame reloads whenever the saved profile changes.
 */
const VIEWPORT_WIDTH = 390;
const VIEWPORT_HEIGHT = 760;

export function MobilePreview({
  profile,
}: {
  profile: Profile;
  links?: Link[];
  projects?: Project[];
  services?: Service[];
  gallery?: GalleryItem[];
}) {
  const { t } = useLocale();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [nonce, setNonce] = useState(0);

  // A save bumps updatedAt on the server, and the dashboard refreshes, so this
  // is the signal that the previewed page has actually changed.
  useEffect(() => {
    setNonce((value) => value + 1);
  }, [profile.updatedAt]);

  const reload = () => setNonce((value) => value + 1);

  return (
    <div className="hidden lg:block sticky top-8 space-y-2" data-testid="mobile-preview">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t("preview.title")}</span>

        <span className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={reload}
            aria-label={t("preview.refresh")}
            title={t("preview.refresh")}
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            asChild
          >
            <a
              href="/account/preview"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("preview.openFull")}
              title={t("preview.openFull")}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </Button>
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-[2.5rem] border-[10px] border-neutral-900 bg-background shadow-2xl dark:border-neutral-700"
        style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }}
      >
        {/* Speaker slot rather than a full notch bar: it reads as a device
            without covering the first rows of the page. */}
        <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center">
          <span className="h-1.5 w-16 rounded-full bg-neutral-900/70 dark:bg-neutral-600" />
        </div>

        <iframe
          ref={frameRef}
          key={nonce}
          src={`/account/preview?preview=${nonce}`}
          title={t("preview.title")}
          // Rendered at the device's own width with no transform, so text is
          // the size a phone actually shows and nothing is resampled.
          width={VIEWPORT_WIDTH}
          height={VIEWPORT_HEIGHT}
          className="block h-full w-full border-0"
          loading="lazy"
        />
      </div>

      <p className="max-w-[390px] text-xs leading-relaxed text-muted-foreground">
        {t("preview.savedOnly")}
      </p>
    </div>
  );
}
