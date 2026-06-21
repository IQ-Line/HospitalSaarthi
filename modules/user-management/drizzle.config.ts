import { defineConfig } from "drizzle-kit";

/**
 * Canonical migration source for the `user-management` module.
 * - `src/schema/tables.ts` is the single source of truth for the `user_management` schema.
 * - `drizzle-kit generate` writes numbered SQL + meta/_journal.json into ./migrations.
 * - Citus distribution is a journaled `--custom` migration.
 * - The better-auth `auth` schema is NOT modelled in tables.ts (better-auth owns those
 *   tables; TEXT PKs, non-distributable). It is journaled as a `--custom` migration so it
 *   still runs once through the same runner. `schemaFilter` lists BOTH schemas this module
 *   owns so drizzle-kit's diff never tries to drop the `auth` objects it doesn't know about.
 * - Applied at runtime via @hims/ts-sdk-db `applyMigrations` (tracking table
 *   drizzle.__drizzle_migrations_user_management — module-unique so modules don't share a
 *   watermark).
 */
export default defineConfig({
  schema: "./src/schema/tables.ts",
  out: "./migrations",
  dialect: "postgresql",
  schemaFilter: ["user_management", "auth"],
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations_user_management",
  },
});
