import { createHash, randomBytes } from "node:crypto";
import type { FideliusEncryptor } from "../ports.js";

/**
 * Dev/sandbox stub — base64-wraps payload with deterministic fake key material.
 * Replace with real Fidelius (Curve25519 + ChaCha20-Poly1305) before production M3.
 */
export class FideliusEncryptorStub implements FideliusEncryptor {
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
    peerPublicKey: string;
    peerNonce: string;
    ourPrivateKey: string;
    ourNonce: string;
  }): Promise<string> {
    const parsed = JSON.parse(
      Buffer.from(input.encryptedPayload, "base64").toString("utf8"),
    ) as { payload?: string };
    return parsed.payload ?? "";
  }
}
