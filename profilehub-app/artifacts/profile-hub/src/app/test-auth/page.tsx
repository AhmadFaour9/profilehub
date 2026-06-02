import { getAuthenticatedUser } from "@/modules/auth";
import { getOrCreateProfile } from "@/lib/profile-data";
import { isSupabaseConfigured } from "@/lib/env";

export default async function TestPage() {
  if (!isSupabaseConfigured()) {
    return <div>Supabase not configured</div>;
  }

  const { supabase: client, user } = await getAuthenticatedUser("test_auth");

  let profileStr = "N/A";
  let profileError = "N/A";
  if (user) {
    try {
      const p = await getOrCreateProfile(user, { source: "dashboard", authClient: client });
      profileStr = JSON.stringify(p, null, 2);
    } catch (e: any) {
      profileError = e?.message || String(e);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Debug Info</h1>
      <h2>Auth User</h2>
      <pre>{JSON.stringify({ userId: user?.id || null, email: user?.email || null }, null, 2)}</pre>
      <h2>Profile</h2>
      <pre>{profileStr}</pre>
      <h2>Profile Error</h2>
      <pre>{profileError}</pre>
    </div>
  );
}
