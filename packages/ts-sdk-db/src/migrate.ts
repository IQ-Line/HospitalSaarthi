import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPool } from "./connection.js";

export interface ApplyMigrationsOptions {
  /**
   * Schema that holds this module's migration-tracking table. Defaults to
   * drizzle's own `drizzle` schema (auto-created). Independent of the module's
   * data schema so a fresh-DB baseline can create the data schema itself.
   */
  migrationsSchema?: string;
  /**
   * Tracking-table name. MUST be unique per module when multiple modules share
   * one database + tracking schema, because the node-postgres migrator advances
   * by the latest applied timestamp recorded in this table — a table shared
   * across separate migration folders would make one module skip the other's
   * pending migrations. Defaults to drizzle's `__drizzle_migrations`.
   */
  migrationsTable?: string;
}

/**
 * Apply pending drizzle-kit migrations from `migrationsFolder` exactly once
 * each, recorded in `<migrationsSchema>.<migrationsTable>`. This is the
 * journal-driven replacement for the legacy hand-written
 * "re-run every .sql on every boot" pattern (no tracking table, no ordering).
 *
 * Each TS module owns a `migrations/` folder (drizzle-kit output: numbered
 * `.sql` + `meta/_journal.json`) and calls this with a module-unique
 * `migrationsTable`.
 */
export async function applyMigrations(
  connectionString: string,
  migrationsFolder: string,
  options: ApplyMigrationsOptions = {},
): Promise<void> {
  const pool = createPool(connectionString);
  try {
    const db = drizzle({ client: pool });
    await migrate(db, {
      migrationsFolder,
      ...(options.migrationsSchema
        ? { migrationsSchema: options.migrationsSchema }
        : {}),
      ...(options.migrationsTable
        ? { migrationsTable: options.migrationsTable }
        : {}),
    });
  } finally {
    await pool.end();
  }
}
