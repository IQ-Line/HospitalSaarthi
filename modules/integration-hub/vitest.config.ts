import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "test/**/integrations/abdm/**/*.test.ts",
      "test/**/lib/**/*.test.ts",
    ],
    exclude: ["**/*.sandbox.integration.test.ts"],
  },
});
