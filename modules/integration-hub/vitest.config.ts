import { defineConfig } from "vitest/config";

import { baseTest } from "../../vitest.base";

export default defineConfig({
  test: {
    ...baseTest,
    // NOTE: this module's `test/integration/**` suites are ALSO collected here by
    // the plain `test` target (the `test:integration` target selects them by path
    // and injects TEST_DATABASE_URL). They must stay runnable without external
    // services in the DB-less run: either fully mocked (m3-hiu-mock-loop) or
    // self-skipping when TEST_DATABASE_URL is unset (scan-share-routes). A real-DB
    // test added WITHOUT such a guard will fail in DB-less CI.
  },
});
