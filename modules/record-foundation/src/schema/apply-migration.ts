import { createDb } from "@hims/ts-sdk-db";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function applyRecordFoundationSchemaMigration(): Promise<void> {
  const db = createDb(process.env["DATABASE_URL"] ?? "");
  const migrationPath = resolve(__dirname, "../../migrations/001_create_record_foundation.sql");
  const sql = readFileSync(migrationPath, "utf-8");
  await db.execute(sql);
  console.log("Record Foundation schema migration applied successfully.");
}
