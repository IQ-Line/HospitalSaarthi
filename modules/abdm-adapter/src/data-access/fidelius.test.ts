import { afterEach, describe, expect, it, vi } from "vitest";
import * as fideliusCrypto from "../lib/fidelius-crypto.js";
import { isSpkiKeyToShareB64 } from "../lib/fidelius-public-key.js";
import { FideliusEncryptor } from "./fidelius.js";

const RAW_POINT =
  "BCpsBW37KgfLyjxJK0zHHG26hDjxzK368DEO4PapzFhQM0cghZziKuvJh5/anTnHitVHKMn0Owr1HvcH1fm0DpA=";

describe("FideliusEncryptor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("encryptBundles emits SPKI keyToShare", async () => {
    const fidelius = new FideliusEncryptor();
    const hiu = await fidelius.generateOurKeyMaterial();
    const batch = await fidelius.encryptBundles({
      payloadJsons: ['{"resourceType":"Bundle"}'],
      peerPublicKey: hiu.ourPublicKey,
      peerNonce: hiu.ourNonce,
    });

    expect(isSpkiKeyToShareB64(batch.ourPublicKey)).toBe(true);
    expect(batch.ourPublicKey.startsWith("MIIB")).toBe(true);
  });

  it("rejects non-SPKI keyToShare before push can use it", async () => {
    const fidelius = new FideliusEncryptor();
    vi.spyOn(fideliusCrypto, "encryptBundlesForPeer").mockReturnValue({
      encryptedPayloads: ["abc"],
      ourPublicKey: RAW_POINT,
      ourNonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    });

    await expect(
      fidelius.encryptBundles({
        payloadJsons: ['{"resourceType":"Bundle"}'],
        peerPublicKey: RAW_POINT,
        peerNonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      }),
    ).rejects.toThrow(/SPKI keyToShare/);
  });

  it("decryptBundle accepts SPKI sender public key from encryptBundles", async () => {
    const fidelius = new FideliusEncryptor();
    const hiu = await fidelius.generateOurKeyMaterial();
    const payload = JSON.stringify({ resourceType: "Bundle", id: "spki-roundtrip" });

    const encrypted = await fidelius.encryptBundles({
      payloadJsons: [payload],
      peerPublicKey: hiu.ourPublicKey,
      peerNonce: hiu.ourNonce,
    });

    const decrypted = await fidelius.decryptBundle({
      encryptedPayload: encrypted.encryptedPayloads[0]!,
      peerPublicKey: encrypted.ourPublicKey,
      peerNonce: encrypted.ourNonce,
      ourPrivateKey: hiu.ourPrivateKey,
      ourNonce: hiu.ourNonce,
    });

    expect(JSON.parse(decrypted)).toEqual(JSON.parse(payload));
  });
});
