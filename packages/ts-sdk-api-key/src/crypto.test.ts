import { describe, expect, it } from "vitest";
import {
  extractTenantApiKeyPrefix,
  generateTenantApiKeySecret,
  hashTenantApiKeySecret,
  isTenantApiKeySecret,
  parseTenantApiKeyEnvironment,
  verifyTenantApiKeySecret,
} from "./crypto.js";

describe("tenant api key crypto", () => {
  it("generates live and test secrets with stable prefix", () => {
    const live = generateTenantApiKeySecret("live");
    expect(live.secret).toMatch(/^hs_opd_live_[A-Za-z0-9_-]{32}$/);
    expect(live.prefix).toBe(live.secret.slice(0, 20));
    expect(parseTenantApiKeyEnvironment(live.secret)).toBe("live");

    const test = generateTenantApiKeySecret("test");
    expect(test.secret).toMatch(/^hs_opd_test_[A-Za-z0-9_-]{32}$/);
    expect(extractTenantApiKeyPrefix(test.secret)).toBe(test.prefix);
  });

  it("hashes and verifies secrets", () => {
    const { secret } = generateTenantApiKeySecret("live");
    const stored = hashTenantApiKeySecret(secret);
    expect(verifyTenantApiKeySecret(secret, stored)).toBe(true);
    expect(verifyTenantApiKeySecret(`${secret}x`, stored)).toBe(false);
    expect(verifyTenantApiKeySecret(secret, "bad")).toBe(false);
  });

  it("rejects malformed secrets", () => {
    expect(isTenantApiKeySecret("not-a-key")).toBe(false);
    expect(extractTenantApiKeyPrefix("hs_opd_live_short")).toBeNull();
  });
});
