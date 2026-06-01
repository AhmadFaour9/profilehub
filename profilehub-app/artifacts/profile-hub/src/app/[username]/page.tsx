import type { Metadata } from "next";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { getPublicProfile, getPublicProfileCached } from "@/lib/profile-data";
import { getCurrentUser } from "@/modules/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileCached(username);

  if (!profile) {
    return { title: "Profile not found | ProfileHub" };
  }

  return {
    title: profile.seoTitle || `${profile.displayName} | ProfileHub`,
    description: profile.seoDescription || profile.bio || `View ${profile.displayName}'s profile.`,
  };
}

export default async function PublicProfileRoute({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const publishedProfile = await getPublicProfileCached(username);

  if (publishedProfile) {
    return <PublicProfile username={username} profile={publishedProfile} />;
  }

  const user = await getCurrentUser();
  const ownerPreviewProfile = user
    ? await getPublicProfile(username, { includeUnpublishedForUserId: user.id })
    : null;

  return <PublicProfile username={username} profile={ownerPreviewProfile} />;
}
