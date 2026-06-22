import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { encryptForPeerMaterialDeterministic } from "../../../../../src/integrations/abdm/lib/fidelius-crypto.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../src/integrations/abdm/test-fixtures/fidelius-java-vector.json",
);

/** Ciphertext from `tools/fidelius-java-vector` (ABDM-wrapper EncryptionService + BC curve25519). */
const JAVA_CIPHERTEXT =
  "Z8gdk156pgqnmpPhQ8xhrhfZS9LuMKYN+JC+e5TiCEr1fgG37WhqLjS3iLRN+nJdZzKT9jMOOt00QVxr";

describe("fidelius-java-vector", () => {
  it("TS encrypt matches Java EncryptionService ciphertext", () => {
    const hipPriv = Buffer.alloc(32, 1).toString("base64");
    const hipNonce = Buffer.alloc(32, 0x11).toString("base64");
    const hiuNonce = Buffer.alloc(32, 0x22).toString("base64");
    const hiuPub =
      "BCpsBW37KgfLyjxJK0zHHG26hDjxzK368DEO4PapzFhQM0cghZziKuvJh5/anTnHitVHKMn0Owr1HvcH1fm0DpA=";
    const plaintext = '{"resourceType":"Bundle","id":"bc-vector-1"}';

    const hip = encryptForPeerMaterialDeterministic({
      payloadJson: plaintext,
      hipPrivateKeyB64: hipPriv,
      hipNonceB64: hipNonce,
      peerPublicKey: hiuPub,
      peerNonce: hiuNonce,
    });

    expect(hip.encryptedPayload).toBe(JAVA_CIPHERTEXT);
  });

  it("writes fixture when UPDATE_FIDELIUS_JAVA_VECTOR=1", () => {
    if (process.env["UPDATE_FIDELIUS_JAVA_VECTOR"] !== "1") return;
    const body = {
      description: "Java BC CustomNamedCurves curve25519 — EncryptionService path",
      ciphertext: JAVA_CIPHERTEXT,
      plaintext: '{"resourceType":"Bundle","id":"bc-vector-1"}',
      hipPrivateKeyB64: Buffer.alloc(32, 1).toString("base64"),
      hipNonceB64: Buffer.alloc(32, 0x11).toString("base64"),
      hiuPublicKeyB64:
        "BCpsBW37KgfLyjxJK0zHHG26hDjxzK368DEO4PapzFhQM0cghZziKuvJh5/anTnHitVHKMn0Owr1HvcH1fm0DpA=",
      hiuNonceB64: Buffer.alloc(32, 0x22).toString("base64"),
    };
    writeFileSync(fixturePath, `${JSON.stringify(body, null, 2)}\n`);
    expect(readFileSync(fixturePath, "utf8")).toContain(JAVA_CIPHERTEXT);
  });
});
