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
  "006_configurator_tenant_org_fk.sql",
  "007_configurator_tenant_integration_profiles.sql",
  "008_configurator_sequence_configuration.sql",
  "009_citus_distribute_tenant_modules.sql",
  "010_deactivate_invalid_tenant_modules.sql",
  "011_tenant_follow_up_config.sql",
] as const;

/** Split SQL on `;` boundaries, respecting dollar quotes, single-quoted strings, and `--` comments. */
export function splitMigrationStatements(ddl: string): string[] {
  const statements: string[] = [];
  let current = "";
  let dollarTag: string | null = null;
  let lineComment = false;
  let singleQuote = false;

  for (let i = 0; i < ddl.length; i += 1) {
    const ch = ddl[i];
    const next = ddl[i + 1];

    if (lineComment) {
      current += ch;
      if (ch === "\n") {
        lineComment = false;
      }
      continue;
    }

    if (singleQuote) {
      current += ch;
      if (ch === "'" && next === "'") {
        current += next;
        i += 1;
        continue;
      }
      if (ch === "'") {
        singleQuote = false;
      }
      continue;
    }

    if (dollarTag === null && ch === "-" && next === "-") {
      lineComment = true;
      current += ch;
      continue;
    }

    if (dollarTag === null && ch === "'") {
      singleQuote = true;
      current += ch;
      continue;
    }

    if (dollarTag === null && ch === "$") {
      const match = ddl.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    } else if (dollarTag !== null && ddl.slice(i).startsWith(dollarTag)) {
      current += dollarTag;
      i += dollarTag.length - 1;
      dollarTag = null;
      continue;
    }

    if (dollarTag === null && ch === ";") {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = "";
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail.length > 0) {
    statements.push(tail);
  }

  return statements;
}

/**
 * Applies `configurator` schema DDL (idempotent — safe to run on every dev boot).
 * Statements run one at a time so Citus/PgBouncer accept DDL on distributed tables.
 */
export async function applyConfiguratorSchemaMigration(
  connectionString: string,
): Promise<void> {
  const db = createDb(connectionString);
  for (const file of MIGRATION_FILES) {
    const ddl = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    for (const statement of splitMigrationStatements(ddl)) {
      await db.execute(sql.raw(statement));
    }
  }
}
