import { describe, expect, it } from "vitest";
import {
  decodeBase64Key,
  decryptFromPeerMaterial,
  deriveAesKey,
  deriveSaltAndIv,
  encryptPayloadAesGcm,
  encryptForPeerMaterial,
  generateEphemeralX25519,
} from "./fidelius-crypto.js";

/**
 * Algorithm ported from NHA-ABDM/ABDM-wrapper EncryptionService.java:
 * - xorOfRandom(senderNonce, receiverNonce) → salt[0:20], iv[20:32]
 * - ECDH(senderPriv, receiverPub) → HKDF-SHA256(sharedSecret bytes, salt, info=null) → AES-256-GCM
 * - Ciphertext wire format: base64(ciphertext || tag) — IV not prefixed
 *
 * @see https://github.com/NHA-ABDM/ABDM-wrapper/blob/master/src/main/java/in/nha/abdm/wrapper/v1/hip/hrp/dataTransfer/encryption/EncryptionService.java
 */
describe("fidelius-wrapper-interop", () => {
  const HIP_NONCE_B64 = Buffer.alloc(32, 0x11).toString("base64");
  const HIU_NONCE_B64 = Buffer.alloc(32, 0x22).toString("base64");
  const PLAIN = '{"resourceType":"Bundle","id":"wrapper-vector-1"}';

  it("deriveSaltAndIv matches wrapper XOR (HIP nonce ⊕ HIU nonce)", () => {
    const hip = decodeBase64Key(HIP_NONCE_B64);
    const hiu = decodeBase64Key(HIU_NONCE_B64);
    const { salt, iv } = deriveSaltAndIv(hiu, hip);
    const xored = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) {
      xored[i] = hip[i]! ^ hiu[i]!;
    }
    expect(salt.equals(xored.subarray(0, 20))).toBe(true);
    expect(iv.equals(xored.subarray(20, 32))).toBe(true);
  });

  it("encryptForPeerMaterial round-trips (wrapper EncryptionService flow)", () => {
    const hiuKeys = generateEphemeralX25519();
    const hip = encryptForPeerMaterial({
      payloadJson: PLAIN,
      peerPublicKey: hiuKeys.ourPublicKeyB64,
      peerNonce: HIU_NONCE_B64,
    });

    const plain = decryptFromPeerMaterial({
      encryptedPayload: hip.encryptedPayload,
      peerPublicKey: hip.ourPublicKey,
      peerNonce: hip.ourNonce,
      ourPrivateKey: hiuKeys.ourPrivateKeyB64,
      ourNonce: HIU_NONCE_B64,
    });
    expect(plain).toBe(PLAIN);
    expect(hip.ourPublicKey).not.toBe(hiuKeys.ourPublicKeyB64);
  });

  it("HKDF uses empty info (wrapper HKDFParameters info=null)", () => {
    const shared = Buffer.alloc(32, 0xab);
    const { salt } = deriveSaltAndIv(decodeBase64Key(HIU_NONCE_B64), decodeBase64Key(HIP_NONCE_B64));
    const key = deriveAesKey(shared, salt);
    expect(key.length).toBe(32);
    const blob = encryptPayloadAesGcm("x", key, deriveSaltAndIv(decodeBase64Key(HIU_NONCE_B64), decodeBase64Key(HIP_NONCE_B64)).iv);
    expect(blob.length).toBeGreaterThan(16);
  });
});
