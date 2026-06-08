import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, sql } from "@hims/ts-sdk-db";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

export async function applyIpdSchemaMigration(connectionString: string): Promise<void> {
  const ddl = readFileSync(join(migrationsDir, "0000_ipd_admission_schema.sql"), "utf8");
  await createDb(connectionString).execute(sql.raw(ddl));
}
