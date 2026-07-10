import { describe, expect, it } from "vitest";
import {
  decryptFromPeerMaterial,
  encryptBundlesForPeer,
  generateEphemeralX25519,
} from "../../../../../src/integrations/abdm/lib/fidelius-crypto.js";
import { isSpkiKeyToShareB64 } from "../../../../../src/integrations/abdm/lib/fidelius-public-key.js";

describe("fidelius-crypto", () => {
  it("round-trips HIP encrypt → HIU decrypt with SPKI keyToShare on wire", () => {
    const hiu = generateEphemeralX25519();
    const hipBatch = encryptBundlesForPeer({
      payloadJsons: ['{"careContext":"VISIT-1"}'],
      peerPublicKey: hiu.ourPublicKeyB64,
      peerNonce: hiu.ourNonceB64,
    });

    expect(isSpkiKeyToShareB64(hipBatch.ourPublicKey)).toBe(true);
    expect(hipBatch.ourPublicKey.startsWith("MIIB")).toBe(true);

    const plain = decryptFromPeerMaterial({
      encryptedPayload: hipBatch.encryptedPayloads[0]!,
      peerPublicKey: hipBatch.ourPublicKey,
      peerNonce: hipBatch.ourNonce,
      ourPrivateKey: hiu.ourPrivateKeyB64,
      ourNonce: hiu.ourNonceB64,
    });

    expect(plain).toBe('{"careContext":"VISIT-1"}');
    expect(hipBatch.ourNonce).not.toBe(hiu.ourNonceB64);
  });
});
