import { describe, expect, it } from "vitest";
import { createFideliusEncryptorFromEnv } from "../../data-access/fidelius.js";
import { isSpkiKeyToShareB64 } from "../../lib/fidelius-public-key.js";

describe("m3 Fidelius round-trip", () => {
  it("HIU keygen → HIP encrypt → HIU decrypt preserves payload (SPKI keyToShare on wire)", async () => {
    const fidelius = createFideliusEncryptorFromEnv();
    const hiu = await fidelius.generateOurKeyMaterial();
    const payload = JSON.stringify({ resourceType: "Bundle", id: "m3-test" });

    const encrypted = await fidelius.encryptForPeer({
      payloadJson: payload,
      peerPublicKey: hiu.ourPublicKey,
      peerNonce: hiu.ourNonce,
    });

    expect(isSpkiKeyToShareB64(encrypted.ourPublicKey)).toBe(true);
    expect(encrypted.ourPublicKey.startsWith("MIIB")).toBe(true);

    const decrypted = await fidelius.decryptBundle({
      encryptedPayload: encrypted.encryptedPayload,
      peerPublicKey: encrypted.ourPublicKey,
      peerNonce: encrypted.ourNonce,
      ourPrivateKey: hiu.ourPrivateKey,
      ourNonce: hiu.ourNonce,
    });

    expect(JSON.parse(decrypted)).toEqual(JSON.parse(payload));
  });
});
