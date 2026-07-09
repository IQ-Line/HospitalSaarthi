import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, sql } from "@hims/ts-sdk-db";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

const MIGRATION_FILES = ["0000_pharmacy_schema.sql", "0001_pharmacy_dispense_refactor.sql"] as const;

/** Applies `pharmacy` schema DDL (idempotent — safe to run on every dev boot). */
export async function applyPharmacySchemaMigration(connectionString: string): Promise<void> {
  const db = createDb(connectionString);
  for (const file of MIGRATION_FILES) {
    const ddl = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    await db.execute(sql.raw(ddl));
  }
}
