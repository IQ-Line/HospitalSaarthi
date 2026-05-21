import type { FideliusEncryptor } from "../ports.js";

/**
 * M2/M3 only — Phase 0 M1 does not use Fidelius (Curve25519 + ChaCha20-Poly1305).
 */
export class FideliusEncryptorStub implements FideliusEncryptor {
  async encryptForPeer(): Promise<never> {
    throw new Error("Fidelius required for M2/M3 only");
  }

  async decryptFromPeer(): Promise<never> {
    throw new Error("Fidelius required for M2/M3 only");
  }
}
