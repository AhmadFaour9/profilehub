import type { Metadata } from "next";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { getPublicProfileCached } from "@/lib/profile-data";
import { getCanonicalProfileUrl } from "@/lib/request-url";
import { getAppUrl } from "@/lib/env";
import { getProfileOgImageUrl, getProfileSeoDescription, getProfileSeoTitle } from "@/lib/profile-seo";
import { generateHrefLangAlternates } from "@/lib/seo";

/**
 * No route-level time cache.
 *
 * `revalidate` cached the whole rendered route per exact path, on top of the
 * tag-based data cache in getPublicProfileCached. Because a save can only call
 * revalidatePath with the canonical username, a visitor who reached the page
 * under different casing kept the pre-save render for the full window.
 *
 * The data is still cached and is now invalidated by tag the moment anything
 * is saved, so edits appear immediately while the database is still shielded
 * from per-request load.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileCached(username);

  if (!profile) {
    return {
      title: "Profile not found | ProfileHub",
      robots: { index: false, follow: false },
    };
  }

  const profileUrl = getCanonicalProfileUrl(profile.username);
  const title = getProfileSeoTitle(profile);
  const description = getProfileSeoDescription(profile);
  const imageUrl = getProfileOgImageUrl(profileUrl);

  return {
    metadataBase: new URL(getAppUrl()),
    title,
    description,
    alternates: {
      canonical: profileUrl,
      languages: generateHrefLangAlternates(`/${profile.username}`),
    },
    openGraph: {
      type: "profile",
      url: profileUrl,
      siteName: "ProfileHub",
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${profile.displayName} ProfileHub profile`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PublicProfileRoute({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfileCached(username);
  const profileUrl = getCanonicalProfileUrl(profile?.username || username);

  return <PublicProfile username={username} profile={profile} profileUrl={profileUrl} />;
}
