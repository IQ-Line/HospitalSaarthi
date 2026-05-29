import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.sandbox.integration.test.ts"],
    setupFiles: ["./vitest.sandbox.setup.ts"],
    testTimeout: 120_000,
  },
});
