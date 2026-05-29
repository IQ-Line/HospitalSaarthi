import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/lib/**/*.test.ts", "src/index.ts"],
    exclude: ["src/integrations/**", "**/*.sandbox.integration.test.ts"],
  },
});
