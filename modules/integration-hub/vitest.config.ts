import { defineConfig } from "vitest/config";

import { baseTest } from "../../vitest.base";

export default defineConfig({
  test: {
    ...baseTest,
    // NOTE: this module's `test/integration/**` suites DO run here (there is no
    // `test:integration` target). They must stay runnable without external services:
    // either fully mocked (m3-hiu-mock-loop) or self-guarded behind an env-var
    // `describe.skipIf` (scan-share-routes). A real-DB test added WITHOUT such a
    // guard will fail in DB-less CI.
  },
});
