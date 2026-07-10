import path from "node:path";

import { defineConfig } from "vitest/config";

import { baseTest } from "../../vitest.base";

export default defineConfig({
  resolve: {
    alias: {
      "@hims/configurator": path.resolve(
        __dirname,
        "../../modules/configurator/src/index.ts",
      ),
      // UM ships as dist (unbuilt in dev) — resolve to src so the PEP composition test can import
      // the principal-enricher plugin, mirroring user-management-svc's vitest resolve.
      "@hims/user-management": path.resolve(
        __dirname,
        "../../modules/user-management/src/index.ts",
      ),
    },
  },
  test: { ...baseTest },
});
