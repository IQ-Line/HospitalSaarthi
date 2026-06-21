import { defineConfig } from "drizzle-kit";

/**
 * Canonical migration source for the `pharmacy` module.
 * - `src/schema/tables.ts` is the single source of truth.
 * - `drizzle-kit generate` writes numbered SQL + meta/_journal.json into ./migrations.
 * - Citus distribution is a journaled `--custom` migration.
 * - Applied at runtime via @hims/ts-sdk-db `applyMigrations` (tracking table
 *   drizzle.__drizzle_migrations_pharmacy — module-unique so modules don't share a watermark).
 */
export default defineConfig({
  schema: "./src/schema/tables.ts",
  out: "./migrations",
  dialect: "postgresql",
  schemaFilter: ["pharmacy"],
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations_pharmacy",
  },
});
