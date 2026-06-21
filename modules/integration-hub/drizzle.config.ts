import { defineConfig } from "drizzle-kit";

/**
 * Canonical migration source for the `integration-hub` module.
 * - `src/integrations/abdm/schema/tables.ts` is the single source of truth.
 * - `drizzle-kit generate` writes numbered SQL + meta/_journal.json into ./migrations.
 * - Citus distribution is a journaled `--custom` migration (no Postgres extensions
 *   are required: the schema uses only gen_random_uuid, built into PG13+).
 * - Applied at runtime via @hims/ts-sdk-db `applyMigrations` (tracking table
 *   drizzle.__drizzle_migrations_integration_hub — module-unique so modules don't
 *   share a watermark).
 */
export default defineConfig({
  schema: "./src/integrations/abdm/schema/tables.ts",
  out: "./migrations",
  dialect: "postgresql",
  schemaFilter: ["integration_hub"],
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations_integration_hub",
  },
});
