import { fileURLToPath } from "node:url";
import { applyMigrations } from "@hims/ts-sdk-db";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../migrations", import.meta.url));

/**
 * Apply pending `user-management` migrations using the drizzle-kit journal under
 * `migrations/` (numbered SQL + meta/_journal.json), tracked in
 * `drizzle.__drizzle_migrations_user_management`. Each migration runs exactly once.
 *
 * Replaces the legacy hand-written "re-run every .sql on every boot" path
 * (no tracking table, idempotency-by-author-vigilance). Source of truth for the
 * `user_management` schema is `src/schema/tables.ts`; regenerate with
 * `nx run user-management:db-generate`. The better-auth `auth` schema is a journaled
 * `--custom` migration (0001) — not modelled in tables.ts — and is non-distributable.
 */
export async function applyUserManagementSchemaMigration(
  connectionString: string,
): Promise<void> {
  await applyMigrations(connectionString, MIGRATIONS_DIR, {
    migrationsSchema: "drizzle",
    migrationsTable: "__drizzle_migrations_user_management",
  });
}
