import { configDefaults } from "vitest/config";

/**
 * Shared Vitest defaults every project spreads into its own `test` block.
 *
 * The single source of truth for the test-collection globs. A per-project `test/**`-only
 * `include` silently drops colocated `src/**` tests — that bug bit three modules before this
 * base existed. Spreading `baseTest` (object spread OVERRIDES arrays, unlike `mergeConfig`
 * which concatenates) guarantees every project collects both trees unless it deliberately
 * narrows `include`.
 *
 * `test/integration/**` is intentionally NOT excluded: those real-DB suites self-skip without
 * `TEST_DATABASE_URL` in the unit `test` run, and the `test:integration` target selects them by
 * path — excluding them here would make that target collect nothing. `*.sandbox.integration`
 * files (manual, live-credential gated) stay out.
 */
export const baseTest = {
  environment: "node" as const,
  include: ["src/**/*.test.ts", "test/**/*.test.ts"],
  exclude: [...configDefaults.exclude, "**/*.sandbox.integration.test.ts"],
};
