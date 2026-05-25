import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, getSupabaseServiceRoleKey, isSupabaseConfigured } from "@/lib/env";

export function createSupabaseAdminClient() {
  if (!isSupabaseConfigured()) return null;

  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    console.error("[AUTH] service_role_missing: SUPABASE_SERVICE_ROLE_KEY is missing.");
    return null;
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (serviceRoleKey === anonKey) {
    console.error("[AUTH] service_role_invalid: SUPABASE_SERVICE_ROLE_KEY is identical to NEXT_PUBLIC_SUPABASE_ANON_KEY. This will cause RLS permission denied errors.");
    return null;
  }

  const { url } = getSupabasePublicEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
