import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, sql } from "@hims/ts-sdk-db";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

const MIGRATION_FILES = [
  "0000_integration_hub_schema.sql",
  "0001_integration_hub_m2_schema.sql",
  "0002_abdm_link_otps.sql",
  "0003_integration_hub_m3_schema.sql",
  "0004_integration_hub_control_plane.sql",
] as const;

/**
 * Applies `integration_hub` schema DDL (idempotent — safe to run on every dev boot).
 */
export async function applyIntegrationHubSchemaMigration(
  connectionString: string,
): Promise<void> {
  const db = createDb(connectionString);
  for (const file of MIGRATION_FILES) {
    const ddl = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    await db.execute(sql.raw(ddl));
  }
}
