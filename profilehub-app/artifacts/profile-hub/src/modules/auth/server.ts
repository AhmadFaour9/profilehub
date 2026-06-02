import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/env";
import type { User } from "@supabase/supabase-js";

type AuthDiagnosticSource =
  | "auth_callback"
  | "dashboard_layout"
  | "dashboard_route"
  | "server_action"
  | "onboarding"
  | "public_profile"
  | "test_auth"
  | "api_route"
  | "logout"
  | "generic";

function logCookieNamesPresent(source: AuthDiagnosticSource, cookieNames: string[]) {
  console.info("[AUTH] cookie_names_present_without_values", {
    source,
    cookie_names: cookieNames,
    count: cookieNames.length,
  });
}

export async function createSupabaseServerClient() {
  const { url, publicKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; middleware refreshes sessions.
        }
      },
    },
  });
}

export async function getAuthenticatedUser(source: AuthDiagnosticSource = "generic"): Promise<{
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User | null;
}> {
  const cookieStore = await cookies();
  logCookieNamesPresent(source, cookieStore.getAll().map((cookie) => cookie.name));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user && error) {
    console.warn("[AUTH] get_user_failed", {
      source,
      message: error.message,
      status: error.status,
    });
  }

  return { supabase, user: user ?? null };
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const { user } = await getAuthenticatedUser("generic");
  return user;
}
