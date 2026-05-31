import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/modules/auth/admin";
import {
  getSupabaseAdminConfig,
  getSupabaseAdminConfigs,
  type ValidSupabaseAdminConfig,
} from "@/lib/supabase-admin-env";

export type SupabaseDbError = {
  code?: string;
  message: string;
};

type SupabaseOperationResult = {
  error: SupabaseDbError | null;
};

export type SupabaseAdminOperationResult<TResult extends SupabaseOperationResult> =
  | {
      ok: true;
      result: TResult;
      client: SupabaseClient;
      config: ValidSupabaseAdminConfig;
    }
  | {
      ok: false;
      error: "public_supabase_missing" | "service_role_missing" | "service_role_invalid" | "admin_db_error";
      dbError?: SupabaseDbError;
      config?: ValidSupabaseAdminConfig;
    };

export type SupabaseAdminOperationFailure = Extract<
  SupabaseAdminOperationResult<SupabaseOperationResult>,
  { ok: false }
>;

export function isSupabasePermissionError(error: SupabaseDbError | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42501" || error.message.toLowerCase().includes("permission denied");
}

export function formatAdminDbError(error: SupabaseDbError | null | undefined): `admin_db_error:${string}` {
  if (!error) return "admin_db_error:unknown";
  if (error.code) return `admin_db_error:${error.code}`;
  if (error.message.toLowerCase().includes("permission denied")) return "admin_db_error:permission_denied";
  return "admin_db_error:unknown";
}

export async function runSupabaseAdminOperation<TResult extends SupabaseOperationResult>(
  operation: (client: SupabaseClient, config: ValidSupabaseAdminConfig) => PromiseLike<TResult> | TResult
): Promise<SupabaseAdminOperationResult<TResult>> {
  const configs = getSupabaseAdminConfigs();

  if (configs.length === 0) {
    const adminConfig = getSupabaseAdminConfig();
    return {
      ok: false,
      error: adminConfig.ok ? "service_role_missing" : adminConfig.error,
    };
  }

  let permissionFailure:
    | {
        config: ValidSupabaseAdminConfig;
        error: SupabaseDbError;
      }
    | null = null;
  let lastFailure:
    | {
        config: ValidSupabaseAdminConfig;
        error: SupabaseDbError;
      }
    | null = null;

  for (let index = 0; index < configs.length; index += 1) {
    const config = configs[index];
    const client = createSupabaseAdminClient(config);
    if (!client) continue;

    const result = await operation(client, config);
    if (!result.error) {
      if (permissionFailure && permissionFailure.config.keySource !== config.keySource) {
        console.warn("[AUTH] admin_key_fallback_used", {
          failed_source: permissionFailure.config.keySource,
          working_source: config.keySource,
        });
      }

      return {
        ok: true,
        result,
        client,
        config,
      };
    }

    lastFailure = { config, error: result.error };

    if (isSupabasePermissionError(result.error) && index < configs.length - 1) {
      permissionFailure ??= lastFailure;
      continue;
    }

    return {
      ok: false,
      error: "admin_db_error",
      dbError: result.error,
      config,
    };
  }

  return {
    ok: false,
    error: "admin_db_error",
    dbError: lastFailure?.error ?? {
      code: "admin_client_missing",
      message: "No valid Supabase admin client could be created.",
    },
    config: lastFailure?.config,
  };
}
