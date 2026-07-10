import { defineConfig } from "vitest/config";

import { baseTest } from "../../vitest.base";

export default defineConfig({
  test: { ...baseTest },
});
