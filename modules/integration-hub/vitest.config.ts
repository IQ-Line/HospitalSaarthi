import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/integrations/abdm/**/*.test.ts", "src/lib/**/*.test.ts"],
    exclude: ["**/*.sandbox.integration.test.ts"],
  },
});
