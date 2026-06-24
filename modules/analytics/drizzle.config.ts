import { defineConfig } from "drizzle-kit";

/**
 * Generate SQL migrations from Drizzle schema (journal under migrations/drizzle/).
 * Requires DATABASE_URL. Example:
 *   From modules/analytics: DATABASE_URL=postgres://... pnpm exec drizzle-kit generate
 * Hand-written SQL in migrations/*.sql remains the canonical apply path until kit output is adopted in CI.
 */
export default defineConfig({
  schema: "./src/schema/tables.ts",
  out: "./migrations/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});
