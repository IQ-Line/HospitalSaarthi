import { createHash, randomBytes } from "node:crypto";
import type { FideliusEncryptor } from "../ports.js";
import {
  decryptFromPeerMaterial,
  encryptBundlesForPeer,
  encryptForPeerMaterial,
} from "../lib/fidelius-crypto.js";

/**
 * ABDM Fidelius encryptor (X25519 ECDH + HKDF-SHA256 + AES-256-GCM).
 * @see https://kiranma72.github.io/abdm-docs/3-milestone2/encryption-decryption/implementation-guidelines/
 */
export class FideliusEncryptor implements FideliusEncryptor {
  async encryptForPeer(input: {
    payloadJson: string;
    peerPublicKey: string;
    peerNonce: string;
  }): Promise<{ encryptedPayload: string; ourPublicKey: string; ourNonce: string }> {
    const result = encryptForPeerMaterial(input);
    return {
      encryptedPayload: result.encryptedPayload,
      ourPublicKey: result.ourPublicKey,
      ourNonce: result.ourNonce,
    };
  }

  async encryptBundlesForPeer(input: {
    payloadJsons: string[];
    peerPublicKey: string;
    peerNonce: string;
  }): Promise<{
    encryptedPayloads: string[];
    ourPublicKey: string;
    ourNonce: string;
  }> {
    return encryptBundlesForPeer(input);
  }

  async decryptFromPeer(input: {
    encryptedPayload: string;
    peerPublicKey: string;
    peerNonce: string;
    ourPrivateKey: string;
    ourNonce: string;
  }): Promise<string> {
    return decryptFromPeerMaterial(input);
  }
}

/** @deprecated Use {@link FideliusEncryptor}. Kept for test imports. */
export const FideliusEncryptorStub = FideliusEncryptor;

/** Legacy base64 stub — only when `ABDM_FIDELIUS_USE_STUB=true` (local webhook tests). */
class FideliusEncryptorLegacyStub implements FideliusEncryptor {
  async encryptBundlesForPeer(input: {
    payloadJsons: string[];
    peerPublicKey: string;
    peerNonce: string;
  }): Promise<{
    encryptedPayloads: string[];
    ourPublicKey: string;
    ourNonce: string;
  }> {
    const encryptedPayloads: string[] = [];
    let ourPublicKey = "";
    let ourNonce = "";
    for (const json of input.payloadJsons) {
      const one = await this.encryptForPeer({
        payloadJson: json,
        peerPublicKey: input.peerPublicKey,
        peerNonce: input.peerNonce,
      });
      encryptedPayloads.push(one.encryptedPayload);
      ourPublicKey = one.ourPublicKey;
      ourNonce = one.ourNonce;
    }
    if (!ourPublicKey) {
      const one = await this.encryptForPeer({
        payloadJson: "{}",
        peerPublicKey: input.peerPublicKey,
        peerNonce: input.peerNonce,
      });
      ourPublicKey = one.ourPublicKey;
      ourNonce = one.ourNonce;
    }
    return { encryptedPayloads, ourPublicKey, ourNonce };
  }

  async encryptForPeer(input: {
    payloadJson: string;
    peerPublicKey: string;
    peerNonce: string;
  }): Promise<{ encryptedPayload: string; ourPublicKey: string; ourNonce: string }> {
    const digest = createHash("sha256")
      .update(input.peerPublicKey)
      .update(input.peerNonce)
      .update(input.payloadJson)
      .digest();
    const encryptedPayload = Buffer.from(
      JSON.stringify({ stub: true, payload: input.payloadJson, digest: digest.toString("hex") }),
    ).toString("base64");
    return {
      encryptedPayload,
      ourPublicKey: randomBytes(32).toString("base64"),
      ourNonce: randomBytes(32).toString("base64"),
    };
  }

  async decryptFromPeer(input: {
    encryptedPayload: string;
  }): Promise<string> {
    const parsed = JSON.parse(
      Buffer.from(input.encryptedPayload, "base64").toString("utf8"),
    ) as { payload?: string };
    return parsed.payload ?? "";
  }
}

export function createFideliusEncryptorFromEnv(): FideliusEncryptor {
  if (process.env["ABDM_FIDELIUS_USE_STUB"] === "true") {
    return new FideliusEncryptorLegacyStub();
  }
  return new FideliusEncryptor();
}
