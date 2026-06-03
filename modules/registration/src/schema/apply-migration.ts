import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, sql } from "@hims/ts-sdk-db";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

const MIGRATION_FILES = [
  "0000_registration_schema.sql",
  "0001_registration_hardening.sql",
  "0002_registration_patient_snapshot.sql",
  "0003_registration_status_simplify.sql",
  "0004_visit_split.sql",
  "0005_visit_provider_to_doctor.sql",
  "0006_visit_id_format.sql",
] as const;
/**
 * Applies `registration` schema DDL (idempotent — safe to run on every dev boot).
 */
export async function applyRegistrationSchemaMigration(
  connectionString: string,
): Promise<void> {
  const db = createDb(connectionString);
  for (const file of MIGRATION_FILES) {
    const ddl = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    await db.execute(sql.raw(ddl));
  }
}
