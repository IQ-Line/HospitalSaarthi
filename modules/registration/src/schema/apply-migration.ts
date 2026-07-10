import { fileURLToPath } from "node:url";
import { applyMigrations } from "@hims/ts-sdk-db";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../migrations", import.meta.url));

/**
 * Apply pending `registration` migrations using the drizzle-kit journal under
 * `migrations/` (numbered SQL + meta/_journal.json), tracked in
 * `drizzle.__drizzle_migrations_registration`. Each migration runs exactly once.
 *
 * Replaces the legacy hand-written "re-run every .sql on every boot" path
 * (no tracking table, idempotency-by-author-vigilance). Source of truth is
 * `src/schema/tables.ts`; regenerate with `nx run registration:db-generate`.
 */
export async function applyRegistrationSchemaMigration(
  connectionString: string,
): Promise<void> {
  await applyMigrations(connectionString, MIGRATIONS_DIR, {
    migrationsSchema: "drizzle",
    migrationsTable: "__drizzle_migrations_registration",
  });
}
