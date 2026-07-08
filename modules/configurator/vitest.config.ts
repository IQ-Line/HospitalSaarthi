import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Include colocated src tests too — a `test/**`-only include silently skips them.
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
  },
});
