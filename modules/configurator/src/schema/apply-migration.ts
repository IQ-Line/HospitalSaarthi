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
  "010_deactivate_invalid_tenant_modules.sql",
  "010_tenant_api_keys.sql",
  "011_tenant_follow_up_config.sql",
] as const;

/**
 * Applies `configurator` schema DDL (idempotent — safe to run on every dev boot).
 * Statements run one at a time so Citus/PgBouncer accept DDL on distributed tables.
 *
 * `009_deactivate_invalid_tenant_modules.sql` is kept in migrations/ for reference only
 * (plain UPDATE — Citus-unsafe). Runtime cleanup uses `010_deactivate_invalid_tenant_modules.sql`.
 */
export async function applyConfiguratorSchemaMigration(
  connectionString: string,
): Promise<void> {
  const db = createDb(connectionString);
  for (const file of MIGRATION_FILES) {
    const ddl = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    try {
      await db.execute(sql.raw(ddl));
    } catch (error) {
      // Data backfill only — Citus may reject cross-schema UPDATE on non-distributed tables.
      if (file === "009_deactivate_invalid_tenant_modules.sql") {
        console.warn(
          `[configurator] skipped ${file} (non-fatal data backfill):`,
          error instanceof Error ? error.message : error,
        );
        continue;
      }
      throw error;
    }
  }
}
