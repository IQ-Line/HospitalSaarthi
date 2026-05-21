import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodePeerPublicKeyPoint } from "./fidelius-curve25519-bc.js";
import {
  decryptFromPeerMaterial,
  encryptForPeerMaterialDeterministic,
  encryptForPeerMaterial,
  generateEphemeralX25519,
} from "./fidelius-crypto.js";

const vectorPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../test-fixtures/fidelius-bc-vector.json",
);

describe("fidelius-bc-vector", () => {
  const v = JSON.parse(readFileSync(vectorPath, "utf8")) as {
    plaintext: string;
    hipPrivateKeyB64: string;
    hipNonceB64?: string;
    hiuPublicKeyB64: string;
    hiuNonceB64?: string;
  };
  const hipNonceB64 = Buffer.alloc(32, 0x11).toString("base64");
  const hiuNonceB64 = Buffer.alloc(32, 0x22).toString("base64");

  it("accepts NHA spec 65-byte Weierstrass keyValue", () => {
    const point = decodePeerPublicKeyPoint(v.hiuPublicKeyB64);
    expect(point.length).toBe(65);
    expect(point[0]).toBe(0x04);
  });

  it("deterministic encrypt matches committed ciphertext", () => {
    const hip = encryptForPeerMaterialDeterministic({
      payloadJson: v.plaintext,
      hipPrivateKeyB64: v.hipPrivateKeyB64,
      hipNonceB64,
      peerPublicKey: v.hiuPublicKeyB64,
      peerNonce: hiuNonceB64,
    });
    expect(hip.encryptedPayload).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(hip.ourPublicKey.length).toBeGreaterThan(40);
  });

  it("HIP encrypt round-trips to HIU decrypt (ephemeral keys)", () => {
    const hiu = generateEphemeralX25519();
    const hip = encryptForPeerMaterial({
      payloadJson: v.plaintext,
      peerPublicKey: hiu.ourPublicKeyB64,
      peerNonce: hiu.ourNonceB64,
    });
    const plain = decryptFromPeerMaterial({
      encryptedPayload: hip.encryptedPayload,
      peerPublicKey: hip.ourPublicKey,
      peerNonce: hip.ourNonce,
      ourPrivateKey: hiu.ourPrivateKeyB64,
      ourNonce: hiu.ourNonceB64,
    });
    expect(plain).toBe(v.plaintext);
  });
});
