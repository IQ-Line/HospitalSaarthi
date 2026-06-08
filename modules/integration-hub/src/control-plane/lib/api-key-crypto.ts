import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;

export type ApiKeyEnvironment = "live" | "test";

export function apiKeyPrefixForEnvironment(env: ApiKeyEnvironment): string {
  return env === "live" ? "hims_live_" : "hims_test_";
}

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
}

function encodeHash(salt: Buffer, derived: Buffer): string {
  return `scrypt:${salt.toString("base64url")}:${derived.toString("base64url")}`;
}

function decodeHash(encoded: string): { salt: Buffer; derived: Buffer } | null {
  const parts = encoded.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return null;
  try {
    return {
      salt: Buffer.from(parts[1]!, "base64url"),
      derived: Buffer.from(parts[2]!, "base64url"),
    };
  } catch {
    return null;
  }
}

export function hashApiKeySecret(secret: string): string {
  const salt = randomBytes(16);
  const derived = deriveKey(secret, salt);
  return encodeHash(salt, derived);
}

export function verifyApiKeySecret(secret: string, encodedHash: string): boolean {
  const decoded = decodeHash(encodedHash);
  if (decoded === null) return false;
  const candidate = deriveKey(secret, decoded.salt);
  if (candidate.length !== decoded.derived.length) return false;
  return timingSafeEqual(candidate, decoded.derived);
}

export function generateApiKeyMaterial(env: ApiKeyEnvironment): {
  prefix: string;
  plaintext_secret: string;
  key_hash: string;
} {
  const prefix = apiKeyPrefixForEnvironment(env);
  const secretBody = randomBytes(24).toString("base64url");
  const plaintext_secret = `${prefix}${secretBody}`;
  return {
    prefix: plaintext_secret.slice(0, 16),
    plaintext_secret,
    key_hash: hashApiKeySecret(plaintext_secret),
  };
}
