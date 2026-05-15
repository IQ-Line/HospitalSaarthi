import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, sql } from "@hims/ts-sdk-db";

const MIGRATION_SQL_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../migrations/0000_registration_schema.sql",
);

/**
 * Applies `registration` schema DDL (idempotent — safe to run on every dev boot).
 */
export async function applyRegistrationSchemaMigration(
  connectionString: string,
): Promise<void> {
  const ddl = readFileSync(MIGRATION_SQL_PATH, "utf8");
  const db = createDb(connectionString);
  await db.execute(sql.raw(ddl));
}
