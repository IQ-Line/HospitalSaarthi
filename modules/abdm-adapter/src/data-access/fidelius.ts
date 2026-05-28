import type { FideliusEncryptor as FideliusEncryptorPort } from "../ports.js";
import {
  decryptFromPeerMaterial,
  encryptBundlesForPeer as encryptBundlesLib,
  encryptForPeerMaterial,
} from "../lib/fidelius-crypto.js";
import { generateEphemeralBcKeyPair } from "../lib/fidelius-curve25519-bc.js";
import { isSpkiKeyToShareB64 } from "../lib/fidelius-public-key.js";
import { randomBytes } from "node:crypto";

/**
 * ABDM Fidelius encryptor — single in-process TypeScript implementation.
 * Outbound HIP pushes emit SPKI keyToShare; inbound keys accept raw point or SPKI.
 * @see docs/architecture/lld/abdm-adapter/12-phr-push-reconciliation.md
 */
export class FideliusEncryptor implements FideliusEncryptorPort {
  async generateOurKeyMaterial(): Promise<{
    ourPublicKey: string;
    ourPrivateKey: string;
    ourNonce: string;
  }> {
    const kp = generateEphemeralBcKeyPair();
    return {
      ourPublicKey: kp.ourPublicKeyB64,
      ourPrivateKey: kp.ourPrivateKeyB64,
      ourNonce: randomBytes(32).toString("base64"),
    };
  }

  async encryptForPeer(input: {
    payloadJson: string;
    peerPublicKey: string;
    peerNonce: string;
  }): Promise<{ encryptedPayload: string; ourPublicKey: string; ourNonce: string }> {
    const batch = await this.encryptBundles({
      payloadJsons: [input.payloadJson],
      peerPublicKey: input.peerPublicKey,
      peerNonce: input.peerNonce,
    });
    return {
      encryptedPayload: batch.encryptedPayloads[0]!,
      ourPublicKey: batch.ourPublicKey,
      ourNonce: batch.ourNonce,
    };
  }

  async encryptBundles(input: {
    payloadJsons: string[];
    peerPublicKey: string;
    peerNonce: string;
  }): Promise<{
    encryptedPayloads: string[];
    ourPublicKey: string;
    ourNonce: string;
  }> {
    const encrypted = encryptBundlesLib(input);
    if (!isSpkiKeyToShareB64(encrypted.ourPublicKey)) {
      throw new Error(
        "Fidelius encrypt must emit X509/SPKI keyToShare for outbound keyMaterial.dhPublicKey.keyValue",
      );
    }
    return encrypted;
  }

  async decryptBundle(input: {
    encryptedPayload: string;
    peerPublicKey: string;
    peerNonce: string;
    ourPrivateKey: string;
    ourNonce: string;
  }): Promise<string> {
    return decryptFromPeerMaterial(input);
  }
}

/** Legacy base64 stub — only when `ABDM_FIDELIUS_USE_STUB=true` (local webhook tests). */
class FideliusEncryptorLegacyStub implements FideliusEncryptorPort {
  async generateOurKeyMaterial(): Promise<{
    ourPublicKey: string;
    ourPrivateKey: string;
    ourNonce: string;
  }> {
    return {
      ourPublicKey: randomBytes(65).toString("base64"),
      ourPrivateKey: randomBytes(32).toString("base64"),
      ourNonce: randomBytes(32).toString("base64"),
    };
  }

  async encryptBundles(input: {
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
      const one = encryptForPeerMaterial({
        payloadJson: json,
        peerPublicKey: input.peerPublicKey,
        peerNonce: input.peerNonce,
      });
      encryptedPayloads.push(one.encryptedPayload);
      ourPublicKey = one.ourPublicKey;
      ourNonce = one.ourNonce;
    }
    if (!ourPublicKey) {
      const one = encryptForPeerMaterial({
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
    const result = encryptForPeerMaterial(input);
    return {
      encryptedPayload: result.encryptedPayload,
      ourPublicKey: result.ourPublicKey,
      ourNonce: result.ourNonce,
    };
  }

  async decryptBundle(input: {
    encryptedPayload: string;
  }): Promise<string> {
    const parsed = JSON.parse(
      Buffer.from(input.encryptedPayload, "base64").toString("utf8"),
    ) as { payload?: string };
    return parsed.payload ?? "";
  }
}

export function createFideliusEncryptorFromEnv(): FideliusEncryptorPort {
  if (process.env["ABDM_FIDELIUS_USE_STUB"] === "true") {
    return new FideliusEncryptorLegacyStub();
  }
  return new FideliusEncryptor();
}
