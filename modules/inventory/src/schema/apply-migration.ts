import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, sql } from "@hims/ts-sdk-db";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

const MIGRATION_FILES = [
  "0000_inventory_schema.sql",
  "0001_inventory_audit_columns.sql",
  "0002_inventory_indent_sequences.sql",
  "0002_inventory_enhancements.sql",
  "0003_inventory_indent_approval_remarks.sql",
  "0004_inventory_stock_transfers.sql",
  "0005_transfer_receive.sql",
  "0006_transfer_dispatch_allocations.sql",
  "0007_transfer_allocation_consumption.sql",
  "0008_stock_adjustments.sql",
] as const;

/** Applies `inventory` schema DDL (idempotent — safe to run on every dev boot). */
export async function applyInventorySchemaMigration(connectionString: string): Promise<void> {
  const db = createDb(connectionString);
  for (const file of MIGRATION_FILES) {
    const ddl = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    await db.execute(sql.raw(ddl));
  }
}
