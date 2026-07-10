import { defineConfig } from "drizzle-kit";

/**
 * Canonical migration source for the `inventory` module.
 * - `src/schema/tables.ts` is the single source of truth.
 * - `drizzle-kit generate` writes numbered SQL + meta/_journal.json into ./migrations.
 * - Citus distribution and the two cyclic FKs (grns↔indents, indents↔stock_transfers)
 *   are journaled `--custom` migrations (no Postgres extensions required —
 *   gen_random_uuid is built into PG13+).
 * - Applied at runtime via @hims/ts-sdk-db `applyMigrations` (tracking table
 *   drizzle.__drizzle_migrations_inventory — module-unique so modules don't share a watermark).
 */
export default defineConfig({
  schema: "./src/schema/tables.ts",
  out: "./migrations",
  dialect: "postgresql",
  schemaFilter: ["inventory"],
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations_inventory",
  },
});
