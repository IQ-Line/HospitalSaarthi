import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "test/**/integrations/abdm/**/*.test.ts",
      "test/**/lib/**/*.test.ts",
      // Colocated unit tests next to the code they cover — previously omitted, so 16
      // src/*.test.ts files silently never ran. `test/integration/**` real-DB and
      // `*.sandbox.integration.test.ts` files stay out (own targets / manual-gated).
      "src/**/*.test.ts",
    ],
    exclude: ["**/*.sandbox.integration.test.ts"],
  },
});
