import path from "node:path";

import { defineConfig } from "vitest/config";

import { baseTest } from "../../vitest.base";

export default defineConfig({
  resolve: {
    alias: {
      // Subpath first — plain-string aliases are prefix-matched, so "." must come last.
      "@hims/user-management/test-support": path.resolve(
        __dirname,
        "../../modules/user-management/src/test-support/index.ts",
      ),
      "@hims/user-management": path.resolve(
        __dirname,
        "../../modules/user-management/src/index.ts",
      ),
    },
  },
  test: { ...baseTest },
});
