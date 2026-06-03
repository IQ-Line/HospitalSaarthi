import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Aes256GcmSessionTokenCrypto } from "./session-token-crypto.js";

describe("Aes256GcmSessionTokenCrypto", () => {
  const key = randomBytes(32);
  const crypto = new Aes256GcmSessionTokenCrypto(key);

  it("round-trips tokens with enc:v1 prefix", () => {
    const plain = "eyJhbGciOiJIUzI1NiJ9.test";
    const enc = crypto.encrypt(plain);
    expect(enc).toMatch(/^enc:v1:/);
    expect(crypto.decrypt(enc)).toBe(plain);
  });

  it("passes through legacy plaintext when decrypting", () => {
    expect(crypto.decrypt("legacy-plain-jwt")).toBe("legacy-plain-jwt");
  });
});
