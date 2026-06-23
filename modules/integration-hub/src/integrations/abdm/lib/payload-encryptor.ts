import {
  createSessionTokenCryptoFromEnv,
  type SessionTokenCrypto,
} from "./session-token-crypto.js";
import type { PayloadEncryptor } from "../ports.js";
import { allowPlaintextTokensAtRest, nodeEnv } from "./abdm-runtime-env.js";

const DEV_PLAINTEXT_ENCRYPTOR: PayloadEncryptor = {
  encrypt(plain: string): string {
    return plain;
  },
  decrypt(cipher: string | null): string | null {
    return cipher;
  },
};

export function createPayloadEncryptorFromEnv(): PayloadEncryptor {
  const crypto = createSessionTokenCryptoFromEnv();
  if (!crypto) {
    if (!allowPlaintextTokensAtRest()) {
      throw new Error(
        `ABDM_TOKEN_ENCRYPTION_KEY is required when NODE_ENV=${nodeEnv()}. ` +
          "Set the key or ABDM_ALLOW_PLAINTEXT_TOKENS=true only for local sandbox.",
      );
    }
    return DEV_PLAINTEXT_ENCRYPTOR;
  }
  return wrapSessionCrypto(crypto);
}

export function wrapSessionCrypto(crypto: SessionTokenCrypto): PayloadEncryptor {
  return {
    encrypt(plain: string): string {
      return crypto.encrypt(plain) ?? plain;
    },
    decrypt(cipher: string | null): string | null {
      return crypto.decrypt(cipher);
    },
  };
}
