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

  // Safe check if it's a valid JWT and what role it has
  try {
    const parts = serviceRoleKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      console.log(`[AUTH] Admin Client created with JWT role: ${payload.role}`);
      if (payload.role !== 'service_role') {
         console.warn(`[AUTH] WARNING: Expected role 'service_role', but found '${payload.role}'. This will cause RLS errors!`);
      }
    } else {
      console.warn(`[AUTH] WARNING: SUPABASE_SERVICE_ROLE_KEY is not a valid JWT format.`);
    }
  } catch (e) {
    console.warn(`[AUTH] WARNING: Failed to decode SUPABASE_SERVICE_ROLE_KEY payload.`);
  }

  const { url } = getSupabasePublicEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
