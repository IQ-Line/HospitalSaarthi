import { randomBytes } from "node:crypto";
import type { FideliusEncryptor as FideliusEncryptorPort } from "../ports.js";
import {
  decryptFromPeerMaterial,
  encryptBundlesForPeer as encryptBundlesForPeerTs,
  encryptForPeerMaterial,
} from "../lib/fidelius-crypto.js";
import { generateEphemeralBcKeyPair } from "../lib/fidelius-curve25519-bc.js";
import { encryptBundlesViaMgrmtech } from "../lib/fidelius-mgrmtech-encrypt.js";
import { resolveStaticFideliusHipKeys } from "../lib/fidelius-http.client.js";

export type FideliusEncryptEngine =
  | "fidelius-http"
  | "fidelius-cli"
  | "fidelius-java"
  | "typescript";

/**
 * ABDM Fidelius encryptor.
 * When static HIP keys are configured (production / sandbox), uses mgrmtech stack
 * (HTTP → CLI → Java) with X509 keyToShare — same path for PHR, HIMS-HIU, LIMS-HIP.
 * Otherwise falls back to in-process TS BC (mock harness / loopback only).
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
    const batch = await this.encryptBundlesForPeer({
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

  async encryptBundlesForPeer(input: {
    payloadJsons: string[];
    peerPublicKey: string;
    peerNonce: string;
  }): Promise<{
    encryptedPayloads: string[];
    ourPublicKey: string;
    ourNonce: string;
    engine: FideliusEncryptEngine;
  }> {
    const staticKeys = resolveStaticFideliusHipKeys();
    if (staticKeys) {
      const mgrmtech = await encryptBundlesViaMgrmtech({
        ...input,
        staticKeys,
      });
      return mgrmtech;
    }

    const ts = encryptBundlesForPeerTs(input);
    return { ...ts, engine: "typescript" };
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

  async encryptBundlesForPeer(input: {
    payloadJsons: string[];
    peerPublicKey: string;
    peerNonce: string;
  }): Promise<{
    encryptedPayloads: string[];
    ourPublicKey: string;
    ourNonce: string;
    engine: FideliusEncryptEngine;
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
    return { encryptedPayloads, ourPublicKey, ourNonce, engine: "typescript" };
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

  async decryptFromPeer(input: {
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
