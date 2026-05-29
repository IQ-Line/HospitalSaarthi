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
  "007_configurator_sequence_configuration.sql",
] as const;

/**
 * Applies `configurator` schema DDL (idempotent — safe to run on every dev boot).
 */
export async function applyConfiguratorSchemaMigration(
  connectionString: string,
): Promise<void> {
  const db = createDb(connectionString);
  for (const file of MIGRATION_FILES) {
    const ddl = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    await db.execute(sql.raw(ddl));
  }
}
