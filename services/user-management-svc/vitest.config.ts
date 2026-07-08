import path from "node:path";

import { defineConfig } from "vitest/config";

import { baseTest } from "../../vitest.base";

export default defineConfig({
  resolve: {
    alias: {
      "@hims/user-management": path.resolve(
        __dirname,
        "../../modules/user-management/src/index.ts",
      ),
    },
  },
  test: { ...baseTest },
});
