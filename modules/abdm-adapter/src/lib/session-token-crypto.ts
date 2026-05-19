import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";

export interface SessionTokenCrypto {
  encrypt(plaintext: string | null): string | null;
  decrypt(stored: string | null): string | null;
}

/** AES-256-GCM for `x_token` / `t_token` at rest (Phase A — env-held key; KMS later). */
export class Aes256GcmSessionTokenCrypto implements SessionTokenCrypto {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) {
      throw new Error("Session token encryption key must be 32 bytes");
    }
  }

  encrypt(plaintext: string | null): string | null {
    if (plaintext == null) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const packed = Buffer.concat([iv, tag, ciphertext]);
    return `${PREFIX}${packed.toString("base64")}`;
  }

  decrypt(stored: string | null): string | null {
    if (stored == null) return null;
    if (!stored.startsWith(PREFIX)) {
      return stored;
    }
    const packed = Buffer.from(stored.slice(PREFIX.length), "base64");
    if (packed.length < 12 + 16 + 1) {
      throw new Error("Invalid encrypted session token payload");
    }
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const ciphertext = packed.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  }
}

function decodeKeyMaterial(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  const b64 = Buffer.from(trimmed, "base64");
  if (b64.length === 32) return b64;
  throw new Error(
    "ABDM_TOKEN_ENCRYPTION_KEY must be 32 bytes (base64) or 64 hex characters",
  );
}

/** Returns crypto when `ABDM_TOKEN_ENCRYPTION_KEY` is set; otherwise null (dev plaintext). */
export function createSessionTokenCryptoFromEnv(): SessionTokenCrypto | null {
  const raw = process.env["ABDM_TOKEN_ENCRYPTION_KEY"]?.trim();
  if (!raw) return null;
  return new Aes256GcmSessionTokenCrypto(decodeKeyMaterial(raw));
}

export function requireSessionTokenCryptoInProd(): void {
  const nodeEnv = process.env["NODE_ENV"] ?? "development";
  if (
    (nodeEnv === "production" || nodeEnv === "staging") &&
    !process.env["ABDM_TOKEN_ENCRYPTION_KEY"]?.trim()
  ) {
    throw new Error(
      "ABDM_TOKEN_ENCRYPTION_KEY is required when NODE_ENV is production or staging",
    );
  }
}
