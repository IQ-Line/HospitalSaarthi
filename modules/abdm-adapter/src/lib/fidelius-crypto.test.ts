import { describe, expect, it } from "vitest";
import {
  decryptFromPeerMaterial,
  encryptBundlesForPeer,
  generateEphemeralX25519,
} from "./fidelius-crypto.js";

describe("fidelius-crypto", () => {
  it("round-trips HIP encrypt → HIU decrypt (ABDM XOR nonce + HKDF + AES-GCM)", () => {
    const hiu = generateEphemeralX25519();
    const hipBatch = encryptBundlesForPeer({
      payloadJsons: ['{"careContext":"VISIT-1"}'],
      peerPublicKey: hiu.ourPublicKeyB64,
      peerNonce: hiu.ourNonceB64,
    });

    const plain = decryptFromPeerMaterial({
      encryptedPayload: hipBatch.encryptedPayloads[0]!,
      peerPublicKey: hipBatch.ourPublicKey,
      peerNonce: hipBatch.ourNonce,
      ourPrivateKey: hiu.ourPrivateKeyB64,
      ourNonce: hiu.ourNonceB64,
    });

    expect(plain).toBe('{"careContext":"VISIT-1"}');
    expect(hipBatch.ourPublicKey).not.toBe(hiu.ourPublicKeyB64);
    expect(hipBatch.ourNonce).not.toBe(hiu.ourNonceB64);
  });
});
