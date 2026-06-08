import { describe, expect, it } from "vitest";
import {
  generateApiKeyMaterial,
  hashApiKeySecret,
  verifyApiKeySecret,
} from "./api-key-crypto.js";

describe("api-key-crypto", () => {
  it("hashes and verifies secrets", () => {
    const secret = "hims_test_example_secret_value";
    const hash = hashApiKeySecret(secret);
    expect(verifyApiKeySecret(secret, hash)).toBe(true);
    expect(verifyApiKeySecret("wrong", hash)).toBe(false);
  });

  it("generates prefixed test keys by default", () => {
    const material = generateApiKeyMaterial("test");
    expect(material.plaintext_secret.startsWith("hims_test_")).toBe(true);
    expect(verifyApiKeySecret(material.plaintext_secret, material.key_hash)).toBe(true);
  });
});
