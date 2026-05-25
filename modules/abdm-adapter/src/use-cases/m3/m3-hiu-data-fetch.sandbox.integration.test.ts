import { describe, it } from "vitest";

/**
 * Sandbox HIU data-fetch leg — run manually when gateway is available:
 * RUN_ABDM_SANDBOX_TESTS=1 npx nx run abdm-adapter:test -- m3-hiu-data-fetch.sandbox
 */
describe.skipIf(process.env["RUN_ABDM_SANDBOX_TESTS"] !== "1")(
  "m3 HIU data-fetch sandbox",
  () => {
    it("placeholder — wire Postman sequence TC-32 after credentials configured", () => {
      expect(process.env["RUN_ABDM_SANDBOX_TESTS"]).toBe("1");
    });
  },
);
