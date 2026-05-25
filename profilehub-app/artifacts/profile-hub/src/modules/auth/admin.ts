import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, getSupabaseServiceRoleKey, isSupabaseConfigured } from "@/lib/env";

export function createSupabaseAdminClient() {
  if (!isSupabaseConfigured()) return null;

  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) return null;

  const { url } = getSupabasePublicEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
