import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, sql } from "@hims/ts-sdk-db";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

const MIGRATION_FILES = [
  "0000_user_management_schema.sql",
  "0001_better_auth_auth_schema.sql",
  "0001_capability_catalog_provenance.sql",
  "0004_roles_role_type.sql",
  "0005_deactivate_noncanonical_capability_actions.sql",
  "0006_user_api_key.sql",
] as const;

/**
 * Applies `user_management` schema DDL (idempotent — safe to run on every dev boot).
 */
export async function applyUserManagementSchemaMigration(
  connectionString: string,
): Promise<void> {
  const db = createDb(connectionString);
  for (const file of MIGRATION_FILES) {
    const ddl = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    await db.execute(sql.raw(ddl));
  }
}
