import Link from "next/link";
import { Globe, Mail, MapPin } from "lucide-react";

import type { Translate } from "@/lib/i18n";
import type { PublicProfile } from "@/modules/shared";

/**
 * Closes the public page with the details a reader looks for once they have
 * decided they are interested: who this is, where they are, and how to reach
 * them - without scrolling back to the header.
 *
 * Each row is omitted when its value is absent or hidden by section
 * visibility, so the footer never shows an empty label.
 */
export function ProfileFooter({
  profile,
  profileUrl,
  t,
}: {
  profile: PublicProfile;
  profileUrl?: string;
  t: Translate;
}) {
  const email = profile.email?.trim();
  const location = profile.location?.trim();
  const website = profile.website?.trim();

  const websiteLabel = (() => {
    if (!website) return null;
    try {
      return new URL(website).hostname.replace(/^www\./, "");
    } catch {
      return website;
    }
  })();

  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t px-4 pt-8" data-testid="profile-footer">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">{profile.displayName}</p>
          {profile.title ? (
            <p className="text-sm text-muted-foreground">{profile.title}</p>
          ) : null}
        </div>

        {(location || email || websiteLabel) && (
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {location ? (
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                <span>{location}</span>
              </li>
            ) : null}

            {email ? (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                <a href={`mailto:${email}`} className="hover:text-foreground hover:underline">
                  {email}
                </a>
              </li>
            ) : null}

            {websiteLabel ? (
              <li className="flex items-center gap-2">
                <Globe className="h-4 w-4 shrink-0" aria-hidden />
                <a
                  href={website!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground hover:underline"
                >
                  {websiteLabel}
                </a>
              </li>
            ) : null}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5 pb-24 text-xs text-muted-foreground md:pb-8">
          <span>
            © {year} {profile.displayName}
          </span>

          <span className="flex items-center gap-3">
            {profileUrl ? (
              <a
                href={profileUrl}
                className="hover:text-foreground hover:underline"
                rel="noopener noreferrer"
              >
                {profileUrl.replace(/^https?:\/\//, "")}
              </a>
            ) : null}

            <Link href="/" className="hover:text-foreground hover:underline">
              {t("public.poweredBy")}
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
