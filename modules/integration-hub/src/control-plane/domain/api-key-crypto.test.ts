import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, verifyApiKey } from "./api-key-crypto.js";

describe("api-key-crypto", () => {
  it("generates live and test key prefixes", () => {
    const live = generateApiKey(true);
    const test = generateApiKey(false);
    expect(live.api_key.startsWith("hims_live_")).toBe(true);
    expect(test.api_key.startsWith("hims_test_")).toBe(true);
    expect(live.key_prefix).toBe(live.api_key.slice(0, 12));
    expect(test.key_prefix).toBe(test.api_key.slice(0, 12));
  });

  it("hashes and verifies api keys with argon2id", async () => {
    const { api_key } = generateApiKey(false);
    const keyHash = await hashApiKey(api_key);
    expect(await verifyApiKey(api_key, keyHash)).toBe(true);
    expect(await verifyApiKey(`${api_key}x`, keyHash)).toBe(false);
  });
});
