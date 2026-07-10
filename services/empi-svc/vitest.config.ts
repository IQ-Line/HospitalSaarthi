import path from "node:path";

import { defineConfig } from "vitest/config";

import { baseTest } from "../../vitest.base";

export default defineConfig({
  resolve: {
    alias: {
      "@hims/empi": path.resolve(__dirname, "../../modules/empi/src/index.ts"),
    },
  },
  test: { ...baseTest },
});
