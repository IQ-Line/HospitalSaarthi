import { defineConfig } from "drizzle-kit";

/**
 * Canonical migration source for the `configurator` module.
 * - `src/schema/tables.ts` is the single source of truth.
 * - `drizzle-kit generate` writes numbered SQL + meta/_journal.json into ./migrations.
 * - Citus distribution/reference classification is a journaled `--custom` migration.
 *   (No Postgres extension is required: gen_random_uuid is built into PG13+ on the
 *    Citus image, and no table uses a trigram/GIN index.)
 * - Applied at runtime via @hims/ts-sdk-db `applyMigrations` (tracking table
 *   drizzle.__drizzle_migrations_configurator — module-unique so modules don't share a watermark).
 */
export default defineConfig({
  schema: "./src/schema/tables.ts",
  out: "./migrations",
  dialect: "postgresql",
  schemaFilter: ["configurator"],
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations_configurator",
  },
});
