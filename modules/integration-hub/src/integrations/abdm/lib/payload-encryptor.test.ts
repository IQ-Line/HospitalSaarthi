import { afterEach, describe, expect, it } from "vitest";
import { createPayloadEncryptorFromEnv } from "./payload-encryptor.js";

describe("createPayloadEncryptorFromEnv", () => {
  const prev = process.env["ABDM_TOKEN_ENCRYPTION_KEY"];

  afterEach(() => {
    if (prev === undefined) {
      delete process.env["ABDM_TOKEN_ENCRYPTION_KEY"];
    } else {
      process.env["ABDM_TOKEN_ENCRYPTION_KEY"] = prev;
    }
  });

  it("uses plaintext passthrough when encryption key is unset (local dev)", () => {
    delete process.env["ABDM_TOKEN_ENCRYPTION_KEY"];
    const enc = createPayloadEncryptorFromEnv();
    const token = "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3MDAwMDAwMDB9.sig";
    expect(enc.encrypt(token)).toBe(token);
    expect(enc.decrypt(token)).toBe(token);
  });
});
