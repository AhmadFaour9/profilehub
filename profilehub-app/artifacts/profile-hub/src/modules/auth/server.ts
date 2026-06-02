import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAppUrl, getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/env";
import { debugLog, measureServer } from "@/lib/perf";
import type { User } from "@supabase/supabase-js";

type AuthDiagnosticSource =
  | "login"
  | "register"
  | "password_reset"
  | "oauth_start"
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

type CookieClientMode = "read-only" | "writable";
type CookieWriteOperation = "set" | "remove";

export type CookieWriteDiagnostics = {
  attempted: string[];
  succeeded: string[];
  failed: string[];
  readOnly: string[];
  setAttempted: string[];
  setSucceeded: string[];
  setFailed: string[];
};

function createCookieWriteDiagnostics(): CookieWriteDiagnostics {
  return {
    attempted: [],
    succeeded: [],
    failed: [],
    readOnly: [],
    setAttempted: [],
    setSucceeded: [],
    setFailed: [],
  };
}

function cookieOperation(options?: { maxAge?: number }): CookieWriteOperation {
  return options?.maxAge === 0 ? "remove" : "set";
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown_error";
}

function logCookieNamesPresent(event: string, source: AuthDiagnosticSource, cookieNames: string[]) {
  debugLog("AUTH", event, {
    source,
    cookie_names: cookieNames,
    count: cookieNames.length,
  });
}

async function getCookieNames(): Promise<string[]> {
  const cookieStore = await cookies();
  return cookieStore.getAll().map((cookie) => cookie.name);
}

async function logRequestDomainDiagnostic(source: AuthDiagnosticSource) {
  try {
    const headerStore = await headers();
    const requestHost = headerStore.get("x-forwarded-host") || headerStore.get("host");
    const requestProto = headerStore.get("x-forwarded-proto") || (requestHost?.startsWith("localhost") ? "http" : "https");
    const requestOrigin = requestHost ? `${requestProto}://${requestHost}` : null;
    const appUrl = getAppUrl();
    const appUrlHost = new URL(appUrl).host;

    debugLog("AUTH", "request_domain", {
      source,
      request_host: requestHost,
      request_origin: requestOrigin,
      app_url_host: appUrlHost,
    });

    if (requestHost && requestHost !== appUrlHost) {
      console.warn("[AUTH] app_url_host_mismatch", {
        source,
        request_host: requestHost,
        app_url_host: appUrlHost,
      });
    }
  } catch (error) {
    console.warn("[AUTH] request_domain_diagnostic_failed", {
      source,
      message: safeErrorMessage(error),
    });
  }
}

async function createSupabaseServerClientWithMode(
  source: AuthDiagnosticSource,
  mode: CookieClientMode,
  diagnostics: CookieWriteDiagnostics
) {
  const { url, publicKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const operation = cookieOperation(options);
          diagnostics.attempted.push(name);
          if (operation === "set") diagnostics.setAttempted.push(name);

          debugLog("AUTH", "supabase_cookie_set_attempt", {
            source,
            mode,
            cookie_name: name,
            operation,
          });

          if (mode === "read-only") {
            diagnostics.readOnly.push(name);
            debugLog("AUTH", "read_only_cookie_context", {
              source,
              cookie_name: name,
              operation,
            });
            return;
          }

          try {
            cookieStore.set(name, value, options);
            diagnostics.succeeded.push(name);
            if (operation === "set") diagnostics.setSucceeded.push(name);
            debugLog("AUTH", "supabase_cookie_set_success", {
              source,
              cookie_name: name,
              operation,
            });
          } catch (error) {
            diagnostics.failed.push(name);
            if (operation === "set") diagnostics.setFailed.push(name);
            console.warn("[AUTH] supabase_cookie_set_failed", {
              source,
              cookie_name: name,
              operation,
              message: safeErrorMessage(error),
            });
          }
        });
      },
    },
  });
}

export async function createSupabaseServerClientReadOnly(source: AuthDiagnosticSource = "generic") {
  const diagnostics = createCookieWriteDiagnostics();
  const supabase = await createSupabaseServerClientWithMode(source, "read-only", diagnostics);
  return { supabase, cookieDiagnostics: diagnostics };
}

export async function createSupabaseServerActionClient(source: AuthDiagnosticSource = "generic") {
  const diagnostics = createCookieWriteDiagnostics();
  const supabase = await createSupabaseServerClientWithMode(source, "writable", diagnostics);
  return { supabase, cookieDiagnostics: diagnostics };
}

export async function createSupabaseServerClient() {
  const { supabase } = await createSupabaseServerActionClient("generic");
  return supabase;
}

export async function getAuthenticatedUser(source: AuthDiagnosticSource = "generic"): Promise<{
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User | null;
}> {
  const cookieNames = await getCookieNames();
  const isServerAction = source === "server_action";
  logCookieNamesPresent(isServerAction ? "server_action_cookie_names" : "cookie_names_present_without_values", source, cookieNames);
  await logRequestDomainDiagnostic(source);

  const { supabase } = isServerAction
    ? await createSupabaseServerActionClient(source)
    : await createSupabaseServerClientReadOnly(source);
  const {
    data: { user },
    error,
  } = await measureServer("getUser", () => supabase.auth.getUser(), { source });

  if (isServerAction) {
    debugLog("AUTH", "server_action_user_found", { found: Boolean(user) });
  }

  if (!user && error) {
    console.warn("[AUTH] get_user_failed", {
      source,
      message: error.message,
      status: error.status,
    });
  }

  return { supabase, user: user ?? null };
}

export const getDashboardAuthenticatedUser = cache(async () => {
  const cookieNames = await getCookieNames();
  logCookieNamesPresent("dashboard_layout_cookie_names", "dashboard_layout", cookieNames);
  await logRequestDomainDiagnostic("dashboard_layout");

  const { supabase } = await createSupabaseServerClientReadOnly("dashboard_layout");
  const {
    data: { user },
    error,
  } = await measureServer("getUser", () => supabase.auth.getUser(), { source: "dashboard_layout" });

  debugLog("AUTH", "dashboard_layout_user_found", { found: Boolean(user) });

  if (!user && error) {
    console.warn("[AUTH] get_user_failed", {
      source: "dashboard_layout",
      message: error.message,
      status: error.status,
    });
  }

  return { supabase, user: user ?? null };
});

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const { user } = await getAuthenticatedUser("generic");
  return user;
}
