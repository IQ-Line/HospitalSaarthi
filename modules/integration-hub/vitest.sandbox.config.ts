import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/integration/**/*.sandbox.integration.test.ts"],
    setupFiles: ["./vitest.sandbox.setup.ts"],
    testTimeout: 120_000,
  },
});
