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

import { isNonDevNodeEnv } from "./abdm-runtime-env.js";

export function requireSessionTokenCryptoInProd(): void {
  if (
    isNonDevNodeEnv() &&
    !process.env["ABDM_TOKEN_ENCRYPTION_KEY"]?.trim()
  ) {
    throw new Error(
      "ABDM_TOKEN_ENCRYPTION_KEY is required when NODE_ENV is production or staging",
    );
  }
}

/** Production startup checks for callback security and upstream dependencies. */
export function requireCallbackSecurityInProd(): void {
  if (!isNonDevNodeEnv()) return;

  const insecure = [
    "ABDM_ALLOW_INSECURE_CALLBACKS",
    "ABDM_M2_MOCK_PLATFORM",
    "ABDM_FIDELIUS_USE_STUB",
    "ABDM_DEV_INBOUND_SIMULATION",
  ] as const;
  for (const key of insecure) {
    if (process.env[key] === "true") {
      throw new Error(`${key} must not be true when NODE_ENV is production or staging`);
    }
  }

  if (!process.env["EMPI_BASE_URL"]?.trim()) {
    throw new Error("EMPI_BASE_URL is required when NODE_ENV is production or staging");
  }
  if (!process.env["RECORD_FOUNDATION_BASE_URL"]?.trim()) {
    throw new Error(
      "RECORD_FOUNDATION_BASE_URL is required when NODE_ENV is production or staging",
    );
  }

  if (process.env["ABDM_ALLOW_INSECURE_CALLBACKS"] === "true") {
    console.warn(
      "[abdm] ABDM_ALLOW_INSECURE_CALLBACKS=true — gateway JWS and consent signature verify SKIPPED",
    );
    return;
  }

  if (!process.env["ABDM_CM_CONSENT_VERIFY_CERT_PEM"]?.trim()) {
    console.warn(
      "[abdm] ABDM_CM_CONSENT_VERIFY_CERT_PEM unset — consent notify signatures will be rejected",
    );
  }
  if (!process.env["ABDM_GATEWAY_JWKS_URL"]?.trim()) {
    console.warn(
      "[abdm] ABDM_GATEWAY_JWKS_URL unset — using default dev gateway JWKS URL; set production JWKS before go-live",
    );
  }
  const smsProvider = (process.env["ABDM_SMS_PROVIDER"] ?? "logging").toLowerCase();
  if (smsProvider === "logging" || smsProvider === "noop") {
    console.warn(
      "[abdm] ABDM_SMS_PROVIDER is logging/noop — user-initiated link OTP SMS will not reach patients",
    );
  }
}
