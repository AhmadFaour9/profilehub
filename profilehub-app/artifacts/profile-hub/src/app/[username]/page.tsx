import type { Metadata } from "next";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { getPublicProfile, getPublicProfileCached } from "@/lib/profile-data";
import { createSupabaseServerClient } from "@/modules/auth";
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
  const publishedProfile = await getPublicProfileCached(username);

  if (publishedProfile) {
    return <PublicProfile username={username} profile={publishedProfile} profileUrl={profileUrl} />;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ownerPreviewProfile = user
    ? await getPublicProfile(username, { includeUnpublishedForUserId: user.id, authClient: supabase })
    : null;

  return <PublicProfile username={username} profile={ownerPreviewProfile} profileUrl={profileUrl} />;
}
