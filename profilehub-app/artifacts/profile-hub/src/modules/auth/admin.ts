import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminConfig, type ValidSupabaseAdminConfig } from "@/lib/supabase-admin-env";

export function createSupabaseAdminClient(config?: ValidSupabaseAdminConfig) {
  const adminConfig = config ?? getSupabaseAdminConfig();

  if (!adminConfig.ok) {
    if (adminConfig.error === "service_role_missing") {
      console.error("[AUTH] service_role_missing: Supabase admin key is missing.", {
        adminKeySource: adminConfig.keySource,
        adminKeyType: adminConfig.keyType,
      });
    } else if (adminConfig.error === "service_role_invalid") {
      console.error("[AUTH] service_role_invalid: Supabase admin key is not a service role key.", {
        adminKeySource: adminConfig.keySource,
        adminKeyType: adminConfig.keyType,
      });
    }
    return null;
  }

  return createClient(adminConfig.url, adminConfig.adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
