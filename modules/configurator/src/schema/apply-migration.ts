import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, sql } from "@hims/ts-sdk-db";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

const MIGRATION_FILES = [
  "001_configurator_core_tables.sql",
  "002_configurator_tenant_modules.sql",
  "003_configurator_tenant_modules_standard_columns.sql",
  "004_configurator_tenant_branch_columns.sql",
  "005_configurator_organization_website.sql",
  "005_backfill_infrastructure_tenant_modules.sql",
  "006_configurator_tenant_org_fk.sql",
  "007_configurator_tenant_integration_profiles.sql",
  "008_configurator_sequence_configuration.sql",
  "009_citus_distribute_tenant_modules.sql",
  "010_tenant_api_keys.sql",
  "011_tenant_follow_up_config.sql",
] as const;

/**
 * Splits PostgreSQL DDL on `;` boundaries while keeping `$$ ... $$` blocks intact.
 */
function splitSqlStatements(ddl: string): string[] {
  const statements: string[] = [];
  let buffer = "";
  let i = 0;

  while (i < ddl.length) {
    if (ddl[i] === "/" && ddl[i + 1] === "*") {
      const end = ddl.indexOf("*/", i + 2);
      if (end === -1) {
        break;
      }
      i = end + 2;
      continue;
    }

    if (ddl[i] === "-" && ddl[i + 1] === "-") {
      const end = ddl.indexOf("\n", i);
      if (end === -1) {
        break;
      }
      i = end + 1;
      continue;
    }

    const dollarMatch = ddl.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
    if (dollarMatch) {
      const tag = dollarMatch[0];
      buffer += tag;
      i += tag.length;
      const closeIdx = ddl.indexOf(tag, i);
      if (closeIdx === -1) {
        buffer += ddl.slice(i);
        break;
      }
      buffer += ddl.slice(i, closeIdx + tag.length);
      i = closeIdx + tag.length;
      continue;
    }

    if (ddl[i] === "'") {
      buffer += ddl[i];
      i += 1;
      while (i < ddl.length) {
        if (ddl[i] === "'") {
          buffer += ddl[i];
          i += 1;
          if (ddl[i] === "'") {
            buffer += ddl[i];
            i += 1;
            continue;
          }
          break;
        }
        buffer += ddl[i];
        i += 1;
      }
      continue;
    }

    if (ddl[i] === ";") {
      const statement = buffer.trim();
      if (statement.length > 0) {
        statements.push(statement);
      }
      buffer = "";
      i += 1;
      continue;
    }

    buffer += ddl[i];
    i += 1;
  }

  const tail = buffer.trim();
  if (tail.length > 0) {
    statements.push(tail);
  }

  return statements;
}

function getPgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  while (current && typeof current === "object") {
    if ("code" in current && typeof (current as { code: unknown }).code === "string") {
      return (current as { code: string }).code;
    }
    current = "cause" in current ? (current as { cause: unknown }).cause : undefined;
  }
  return undefined;
}

function isSkippableCitusReapplyError(error: unknown): boolean {
  const code = getPgErrorCode(error);
  return code === "XX000" || code === "0A000" || code === "42701" || code === "42P07";
}

/**
 * Applies `configurator` schema DDL (idempotent — safe to run on every dev boot).
 * Each statement runs separately so Citus/PgBouncer accept DDL on distributed tables.
 *
 * `009_deactivate_invalid_tenant_modules.sql` is kept in migrations/ for reference only
 * (plain UPDATE — Citus-unsafe). Orphan cleanup runs at runtime in listEntitlementEnabledModuleIds().
 */
export async function applyConfiguratorSchemaMigration(
  connectionString: string,
): Promise<void> {
  const db = createDb(connectionString);
  for (const file of MIGRATION_FILES) {
    const ddl = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    const statements = splitSqlStatements(ddl);
    for (const statement of statements) {
      try {
        await db.execute(sql.raw(statement));
      } catch (error) {
        if (isSkippableCitusReapplyError(error)) {
          console.warn(
            `[configurator] skipped statement in ${file} (already applied):`,
            error instanceof Error ? error.message : error,
          );
          continue;
        }
        throw error;
      }
    }
  }
}
