import type { Metadata } from "next";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { getPublicProfileCached } from "@/lib/profile-data";
import { getProfileUrl, getRequestOrigin } from "@/lib/request-url";

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
  const origin = await getRequestOrigin();
  const profileUrl = getProfileUrl(origin, username);
  const profile = await getPublicProfileCached(username);

  return <PublicProfile username={username} profile={profile} profileUrl={profileUrl} />;
}
