import { describe, expect, it } from "vitest";
import { createFideliusEncryptorFromEnv } from "../../data-access/fidelius.js";

describe("m3 Fidelius round-trip", () => {
  it("HIU keygen → HIP encrypt → HIU decrypt preserves payload", async () => {
    const fidelius = createFideliusEncryptorFromEnv();
    const hiu = await fidelius.generateOurKeyMaterial();
    const payload = JSON.stringify({ resourceType: "Bundle", id: "m3-test" });

    const encrypted = await fidelius.encryptForPeer({
      payloadJson: payload,
      peerPublicKey: hiu.ourPublicKey,
      peerNonce: hiu.ourNonce,
    });

    const decrypted = await fidelius.decryptFromPeer({
      encryptedPayload: encrypted.encryptedPayload,
      peerPublicKey: encrypted.ourPublicKey,
      peerNonce: encrypted.ourNonce,
      ourPrivateKey: hiu.ourPrivateKey,
      ourNonce: hiu.ourNonce,
    });

    expect(JSON.parse(decrypted)).toEqual(JSON.parse(payload));
  });
});
