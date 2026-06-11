import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, sql } from "@hims/ts-sdk-db";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

const MIGRATION_FILES = [
  "0000_ipd_admission_schema.sql",
  "0001_clinical_notes.sql",
  "0002_vital_signs.sql",
  "0003_inpatient_orders.sql",
] as const;

export async function applyIpdSchemaMigration(connectionString: string): Promise<void> {
  const db = createDb(connectionString);
  for (const file of MIGRATION_FILES) {
    const ddl = readFileSync(join(migrationsDir, file), "utf8");
    await db.execute(sql.raw(ddl));
  }
}
