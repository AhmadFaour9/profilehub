#!/usr/bin/env node
/**
 * Supabase backend health check.
 *
 * Verifies that the remote Supabase project is reachable and correctly
 * provisioned for ProfileHub: REST + Auth are up, every expected table exists,
 * and every storage bucket the app writes to is present.
 *
 * Usage:
 *   npm run check:supabase
 *
 * Reads .env.local (falling back to .env) from the app root.
 * Exits non-zero if any required check fails.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const EXPECTED_TABLES = [
  "profiles",
  "themes",
  "links",
  "smart_links",
  "social_links",
  "projects",
  "services",
  "media",
  "page_views",
  "link_clicks",
  "smart_link_clicks",
  "ai_usage_logs",
  "audit_logs",
  "system_logs",
];

const EXPECTED_BUCKETS = ["avatars", "covers", "project-media", "gallery-media"];

const REQUEST_TIMEOUT_MS = 15_000;

// ── env loading ─────────────────────────────────────────────────────────────

function loadEnvFile() {
  const candidates = [".env.local", ".env"].map((f) => join(APP_ROOT, f));
  const path = candidates.find(existsSync);

  if (!path) {
    fail(
      "No .env.local or .env found.",
      `Create one:  cp .env.example .env.local   (in ${APP_ROOT})`
    );
    process.exit(1);
  }

  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Real environment variables win over the file.
    if (!(key in process.env)) process.env[key] = value;
  }

  return path;
}

// ── output helpers ──────────────────────────────────────────────────────────

const results = { passed: 0, failed: 0, warned: 0 };

const pass = (msg, detail) => {
  results.passed++;
  console.log(`  \x1b[32mPASS\x1b[0m  ${msg}${detail ? `  \x1b[90m${detail}\x1b[0m` : ""}`);
};

const fail = (msg, detail) => {
  results.failed++;
  console.log(`  \x1b[31mFAIL\x1b[0m  ${msg}`);
  if (detail) console.log(`        \x1b[90m${detail}\x1b[0m`);
};

const warn = (msg, detail) => {
  results.warned++;
  console.log(`  \x1b[33mWARN\x1b[0m  ${msg}`);
  if (detail) console.log(`        \x1b[90m${detail}\x1b[0m`);
};

const section = (title) => console.log(`\n\x1b[1m${title}\x1b[0m`);

/** Redact everything but a short prefix, so keys never land in a log or screenshot. */
const redact = (key) => (key ? `${key.slice(0, 12)}...(${key.length} chars)` : "missing");

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return { ok: true, response: await fetch(url, { ...options, signal: controller.signal }) };
  } catch (error) {
    const aborted = error?.name === "AbortError";
    return {
      ok: false,
      error: aborted ? `timed out after ${REQUEST_TIMEOUT_MS / 1000}s` : String(error?.cause?.code || error?.message || error),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── checks ──────────────────────────────────────────────────────────────────

function checkEnv() {
  section("Environment");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  const secretKey = (
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  ).trim();

  if (url) pass("NEXT_PUBLIC_SUPABASE_URL", url);
  else fail("NEXT_PUBLIC_SUPABASE_URL is missing");

  if (publicKey) pass("Supabase public key", redact(publicKey));
  else fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / _ANON_KEY is missing");

  if (secretKey) pass("Supabase secret key", redact(secretKey));
  else warn("SUPABASE_SECRET_KEY / SERVICE_ROLE_KEY is missing", "Table and bucket checks will be skipped.");

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) pass("APP_URL", appUrl);
  else warn("APP_URL / NEXT_PUBLIC_APP_URL is missing", "QR codes and OAuth redirects need this.");

  return { url, publicKey, secretKey };
}

/** 5xx from the edge means the project is booting or down, not misconfigured. */
const STARTING_UP = new Set([502, 503, 520, 521, 522, 523, 524]);

async function checkReachability(url, publicKey, secretKey) {
  section("Connectivity");

  // The /rest/v1/ root is privileged: Supabase answers 401 with
  // "Only secret API keys can be used for this endpoint" for a publishable or
  // anon key. Probe it with the secret key, and fall back to a table read.
  const probeKey = secretKey || publicKey;
  const rest = await request(`${url}/rest/v1/`, {
    headers: { apikey: probeKey, Authorization: `Bearer ${probeKey}` },
  });

  if (!rest.ok) {
    fail(
      `REST API unreachable  (${rest.error})`,
      "A paused Supabase project is the usual cause. Restore it in the dashboard."
    );
    return false;
  }

  if (STARTING_UP.has(rest.response.status)) {
    fail(
      `REST API not serving yet  (HTTP ${rest.response.status})`,
      "The project is still starting. Wait for status ACTIVE_HEALTHY, then re-run."
    );
    return false;
  }

  if (rest.response.status === 401) {
    const body = await rest.response.json().catch(() => ({}));
    fail(
      "REST API rejected the key (401)",
      body.message
        ? `${body.message}${body.hint ? ` — ${body.hint}` : ""}`
        : "The key does not belong to this project, or it was rotated."
    );
    return false;
  }

  pass("REST API reachable", `HTTP ${rest.response.status}`);

  // Validate the public key separately, against an endpoint it is allowed to use.
  const auth = await request(`${url}/auth/v1/health`, { headers: { apikey: publicKey } });

  if (!auth.ok) {
    warn("Auth health endpoint unreachable", auth.error);
  } else if (auth.response.ok) {
    const body = await auth.response.json().catch(() => ({}));
    pass("Auth service healthy", body.version ? `GoTrue ${body.version}` : "");
    pass("Public key accepted by Auth");
  } else if (auth.response.status === 401) {
    fail("Auth rejected the public key (401)", "Check NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  } else {
    warn("Auth health endpoint returned an unexpected status", `HTTP ${auth.response.status}`);
  }

  return true;
}

async function checkTables(url, secretKey) {
  section(`Schema  (${EXPECTED_TABLES.length} tables)`);

  const missing = [];

  for (const table of EXPECTED_TABLES) {
    const result = await request(`${url}/rest/v1/${table}?select=*&limit=0`, {
      method: "HEAD",
      headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
    });

    if (!result.ok) {
      fail(`${table}  (${result.error})`);
      missing.push(table);
      continue;
    }

    // PostgREST answers 404 when the relation is absent from the exposed schema.
    if (result.response.status === 404) {
      fail(`${table}  — table not found`);
      missing.push(table);
    } else if (result.response.status >= 400) {
      warn(`${table}  — HTTP ${result.response.status}`);
    } else {
      pass(table);
    }
  }

  if (missing.length) {
    console.log(
      `\n        \x1b[90mRun migrations:  npm run db:push\x1b[0m`
    );
  }
}

async function checkBuckets(url, secretKey) {
  section("Storage buckets");

  const result = await request(`${url}/storage/v1/bucket`, {
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
  });

  if (!result.ok) {
    fail(`Bucket listing failed  (${result.error})`);
    return;
  }

  if (!result.response.ok) {
    fail(`Bucket listing failed  (HTTP ${result.response.status})`);
    return;
  }

  const buckets = await result.response.json().catch(() => []);
  const names = new Set((Array.isArray(buckets) ? buckets : []).map((b) => b.id ?? b.name));

  for (const bucket of EXPECTED_BUCKETS) {
    if (names.has(bucket)) pass(bucket);
    else fail(`${bucket}  — bucket not found`, "Created by 202605240001_initial_schema.sql");
  }
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n\x1b[1mProfileHub — Supabase health check\x1b[0m");

  const envPath = loadEnvFile();
  console.log(`\x1b[90mUsing ${envPath}\x1b[0m`);

  const { url, publicKey, secretKey } = checkEnv();

  if (!url || !publicKey) {
    summarize();
    return;
  }

  const reachable = await checkReachability(url, publicKey, secretKey);

  if (reachable && secretKey) {
    await checkTables(url, secretKey);
    await checkBuckets(url, secretKey);
  } else if (reachable) {
    section("Schema and storage");
    warn("Skipped", "Set SUPABASE_SECRET_KEY to verify tables and buckets.");
  }

  summarize();
}

function summarize() {
  const { passed, failed, warned } = results;
  console.log(
    `\n\x1b[1mSummary\x1b[0m  ` +
      `\x1b[32m${passed} passed\x1b[0m  ` +
      `\x1b[33m${warned} warned\x1b[0m  ` +
      `\x1b[31m${failed} failed\x1b[0m\n`
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("\nUnexpected error:", error);
  process.exit(1);
});
