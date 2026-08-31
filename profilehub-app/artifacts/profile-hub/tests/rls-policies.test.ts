import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Row Level Security is the only thing standing between one user's data and
 * every other user's. The application never enforces this itself - it hands a
 * user's JWT to PostgREST and trusts the database - so a table shipped without
 * a policy is a silent, total leak that no route test would notice.
 *
 * These read the migrations rather than a live database: they run in CI with no
 * network, no credentials, and no rows created in anyone's project, and they
 * fail on the commit that introduces the hole rather than after it deploys.
 *
 * Every helper below is pure so the same checks can be aimed at deliberately
 * broken SQL further down - a guard nobody has proved can fail is not a guard.
 */

const MIGRATIONS = join(__dirname, "..", "supabase", "migrations");

function loadMigrations(): string {
  return readdirSync(MIGRATIONS)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(MIGRATIONS, file), "utf8"))
    .join("\n");
}

const squash = (value: string) => value.replace(/\s+/g, " ").trim();

/** Tables created in the public schema, deduplicated across migrations. */
export function findTables(sql: string): string[] {
  const matches = sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi);
  return [...new Set([...matches].map((match) => match[1].toLowerCase()))];
}

export function findRlsEnabled(sql: string): Set<string> {
  const matches = sql.matchAll(
    /alter\s+table\s+public\.(\w+)\s+enable\s+row\s+level\s+security/gi
  );
  return new Set([...matches].map((match) => match[1].toLowerCase()));
}

export type Policy = {
  name: string;
  schema: string;
  table: string;
  action: string;
  roles: string[];
  body: string;
};

export function findPolicies(sql: string): Policy[] {
  const policies: Policy[] = [];

  for (const match of sql.matchAll(/create\s+policy\s+"([^"]+)"(.*?);/gis)) {
    const statement = squash(match[2]);

    const target = /^on\s+(\w+)\.(\w+)\s+for\s+(\w+(?:\s+\w+)?)/i.exec(statement);
    if (!target) continue;

    // Roles only count up to the predicate; "to authenticated" inside a using
    // clause would not be a grant.
    const predicateStart = statement.search(/\b(using|with\s+check)\b/i);
    const head = predicateStart === -1 ? statement : statement.slice(0, predicateStart);
    const roleMatch = /\bto\s+([\w\s,]+?)\s*$/i.exec(head);

    policies.push({
      name: match[1],
      schema: target[1].toLowerCase(),
      table: target[2].toLowerCase(),
      action: target[3].toLowerCase().split(/\s+/)[0],
      roles: roleMatch
        ? roleMatch[1]
            .split(",")
            .map((role) => role.trim().toLowerCase())
            .filter(Boolean)
        : [],
      body: statement,
    });
  }

  return policies;
}

/** A policy that lets the caller through without checking who they are. */
export function isUnqualified(policy: Policy): boolean {
  if (policy.roles.includes("service_role")) return false;
  return /\b(using|with\s+check)\s*\(\s*true\s*\)/i.test(policy.body);
}

/** A policy that writes must prove the caller owns the row. */
export function isOwnerScoped(policy: Policy): boolean {
  return /auth\.uid\(\)/i.test(policy.body) || /is_profile_owner\s*\(/i.test(policy.body);
}

/** A policy readable by the public must only expose published rows. */
export function isPublicationGated(policy: Policy): boolean {
  return /is_profile_published\s*\(/i.test(policy.body) || /\bis_published\b/i.test(policy.body);
}

const WRITE_ACTIONS = new Set(["all", "insert", "update", "delete"]);

/**
 * Tables deliberately left with no policy at all. RLS with zero policies denies
 * everything to anon and authenticated, which is what a log written only by the
 * service role should do. Anything not listed here needs a policy.
 */
const DENY_ALL_TABLES = new Set(["system_logs"]);

const sql = loadMigrations();
const tables = findTables(sql);
const rlsEnabled = findRlsEnabled(sql);
const policies = findPolicies(sql);

describe("row level security", () => {
  // Guards the guards. If a rename or a reformat breaks the parsing above,
  // every check below would pass over an empty list and prove nothing.
  it("parses the migrations", () => {
    expect(tables.length).toBeGreaterThan(8);
    expect(policies.length).toBeGreaterThan(20);
    expect(policies.every((policy) => policy.table && policy.action)).toBe(true);
  });

  it("enables RLS on every table in the public schema", () => {
    expect(tables.filter((table) => !rlsEnabled.has(table))).toEqual([]);
  });

  it("gives every table a policy, or leaves it deliberately closed", () => {
    const covered = new Set(policies.map((policy) => policy.table));
    const uncovered = tables.filter(
      (table) => !covered.has(table) && !DENY_ALL_TABLES.has(table)
    );
    expect(uncovered).toEqual([]);
  });

  it("lets nothing but the service role through unqualified", () => {
    expect(policies.filter(isUnqualified).map((policy) => policy.name)).toEqual([]);
  });

  it("scopes every write to the owner of the row", () => {
    const unscoped = policies
      .filter(
        (policy) =>
          WRITE_ACTIONS.has(policy.action) &&
          !policy.roles.includes("service_role") &&
          !isOwnerScoped(policy)
      )
      .map((policy) => policy.name);

    expect(unscoped).toEqual([]);
  });

  it("exposes only published rows to readers who are not signed in", () => {
    const leaky = policies
      .filter(
        (policy) =>
          policy.schema === "public" &&
          policy.action === "select" &&
          // A policy restricted to authenticated is the owner reading their own
          // rows; the ownership check below covers it instead.
          !(policy.roles.length === 1 && policy.roles[0] === "authenticated") &&
          !isPublicationGated(policy)
      )
      .map((policy) => policy.name);

    expect(leaky).toEqual([]);
  });

  it("scopes analytics reads to the profile owner", () => {
    // Views and clicks are the one place where another user's rows are most
    // tempting to expose, because nothing about them looks like private data.
    for (const table of ["page_views", "link_clicks", "smart_link_clicks"]) {
      const forTable = policies.filter((policy) => policy.table === table);
      expect(forTable.length).toBeGreaterThan(0);
      expect(forTable.every(isOwnerScoped)).toBe(true);
    }
  });

  it("pins the search path on every security definer function", () => {
    // A security definer function without a pinned search_path can be made to
    // call an attacker's table of the same name, running as its owner.
    const unpinned = [
      ...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([\w.]+)\s*\((.*?)\$\$/gis),
    ]
      .filter(([body]) => /security\s+definer/i.test(body))
      .filter(([body]) => !/set\s+search_path\s*=/i.test(body))
      .map((match) => match[1]);

    expect(unpinned).toEqual([]);
  });

  it("decides ownership from the caller's own identity", () => {
    const owner = /create\s+or\s+replace\s+function\s+public\.is_profile_owner(.*?)\$\$;/is.exec(
      sql
    );
    expect(owner).not.toBeNull();
    expect(owner![1]).toMatch(/user_id\s*=\s*auth\.uid\(\)/i);
    expect(owner![1]).toMatch(/security\s+definer/i);
  });
});

/**
 * The checks above only mean something if they can fail. Each of these is a
 * hole someone could plausibly ship, aimed at the same functions.
 */
describe("the checks catch the holes they are for", () => {
  it("catches a table shipped without RLS", () => {
    const broken = "create table public.invoices (id uuid primary key);";
    expect(findTables(broken)).toEqual(["invoices"]);
    expect(findRlsEnabled(broken).has("invoices")).toBe(false);
  });

  it("catches a policy open to every signed-in user", () => {
    const broken = `create policy "invoices: read" on public.invoices for select to authenticated using (true);`;
    expect(findPolicies(broken).filter(isUnqualified)).toHaveLength(1);
  });

  it("does not flag the service role, which is trusted by design", () => {
    const fine = `create policy "jobs: worker" on public.jobs for all to service_role using (true) with check (true);`;
    expect(findPolicies(fine).filter(isUnqualified)).toEqual([]);
  });

  it("catches a write policy that never checks ownership", () => {
    const broken = `create policy "invoices: edit" on public.invoices for update to authenticated using (is_active = true);`;
    const [policy] = findPolicies(broken);
    expect(policy.action).toBe("update");
    expect(isOwnerScoped(policy)).toBe(false);
  });

  it("catches a public read that ignores publication", () => {
    const broken = `create policy "drafts: read" on public.drafts for select using (is_active = true);`;
    expect(isPublicationGated(findPolicies(broken)[0])).toBe(false);
  });

  it("reads the roles a policy is granted to", () => {
    const statement = `create policy "x" on public.y for all to anon, authenticated using (public.is_profile_owner(profile_id));`;
    expect(findPolicies(statement)[0].roles).toEqual(["anon", "authenticated"]);
  });
});
