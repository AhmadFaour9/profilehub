import "server-only";

import { createSupabaseAdminClient } from "@/modules/auth";
import {  safeMetadata  } from "@/modules/shared/security";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogScope = "auth" | "profile" | "links" | "projects" | "analytics" | "ai" | "storage";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  const configured = (process.env.LOG_LEVEL as LogLevel | undefined) || "info";
  return LEVEL_WEIGHT[level] >= (LEVEL_WEIGHT[configured] ?? LEVEL_WEIGHT.info);
}

export async function log(level: LogLevel, scope: LogScope, message: string, metadata: Record<string, unknown> = {}) {
  if (!shouldLog(level)) return;

  const safe = safeMetadata(metadata) as Record<string, unknown>;

  if (process.env.NODE_ENV !== "production") {
    const writer = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    writer(`[${level}] [${scope}] ${message}`, safe);
    return;
  }

  if (level === "debug") return;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return;

  await supabase.from("system_logs").insert({
    level,
    scope,
    message,
    metadata: safe,
  });
}

export async function auditLog(input: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
  userAgentHash?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return;

  await supabase.from("audit_logs").insert({
    user_id: input.userId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    metadata: safeMetadata(input.metadata || {}),
    ip_hash: input.ipHash || null,
    user_agent_hash: input.userAgentHash || null,
  });
}
