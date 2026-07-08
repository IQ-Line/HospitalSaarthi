import { defineConfig } from "vitest/config";

import { baseTest } from "../../vitest.base";

export default defineConfig({
  test: {
    ...baseTest,
    // Deliberately narrowed: broad `test/**` would pull this module's real-DB
    // `test/integration/**` suites into the unit run (it has no `test:integration`
    // target). Colocated `src/**` unit tests are included; sandbox tests stay out
    // via baseTest.exclude.
    include: [
      "test/**/integrations/abdm/**/*.test.ts",
      "test/**/lib/**/*.test.ts",
      "src/**/*.test.ts",
    ],
  },
});
