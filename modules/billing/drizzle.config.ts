import { defineConfig } from "drizzle-kit";

/**
 * Canonical migration source for the `billing` module.
 * - `src/schema/tables.ts` is the single source of truth.
 * - `drizzle-kit generate` writes numbered SQL + meta/_journal.json into ./migrations.
 * - Citus distribution is a journaled `--custom` migration (no extensions needed:
 *   all PKs use gen_random_uuid, built into PG13+; no trigram/GIN indexes).
 * - Applied at runtime via @hims/ts-sdk-db `applyMigrations` (tracking table
 *   drizzle.__drizzle_migrations_billing — module-unique so modules don't share a watermark).
 */
export default defineConfig({
  schema: "./src/schema/tables.ts",
  out: "./migrations",
  dialect: "postgresql",
  schemaFilter: ["billing"],
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations_billing",
  },
});
