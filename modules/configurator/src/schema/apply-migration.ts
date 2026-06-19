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

/** Split a SQL file into executable statements (respects `DO $$ … $$` blocks, strings, and `--` comments). */
function splitSqlStatements(sqlText: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inDollarQuote = false;
  let dollarTag = "";
  let inLineComment = false;
  let inSingleQuote = false;

  for (let i = 0; i < sqlText.length; i++) {
    const ch = sqlText[i];
    const next = sqlText[i + 1];

    if (inLineComment) {
      current += ch;
      if (ch === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inSingleQuote) {
      current += ch;
      if (ch === "'" && next === "'") {
        current += next;
        i += 1;
        continue;
      }
      if (ch === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (!inDollarQuote && ch === "-" && next === "-") {
      inLineComment = true;
      current += ch;
      continue;
    }

    if (!inDollarQuote && ch === "'") {
      inSingleQuote = true;
      current += ch;
      continue;
    }

    if (!inDollarQuote && ch === "$") {
      const match = sqlText.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
      if (match) {
        inDollarQuote = true;
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    } else if (inDollarQuote && sqlText.slice(i).startsWith(dollarTag)) {
      current += dollarTag;
      i += dollarTag.length - 1;
      inDollarQuote = false;
      dollarTag = "";
      continue;
    }

    if (ch === ";" && !inDollarQuote) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = "";
      continue;
    }

    current += ch;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements.filter((statement) => {
    const withoutComments = statement
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim();
    return withoutComments.length > 0;
  });
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
