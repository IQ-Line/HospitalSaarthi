import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type TenantApiKeyEnvironment = "live" | "test";
export type UserApiKeyEnvironment = "live" | "test";

/** Visible prefix length used for DB lookup (includes `hs_opd_{env}_` + random segment). */
export const TENANT_API_KEY_PREFIX_LENGTH = 20;

const SECRET_BODY_LENGTH = 32;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;

const SECRET_PATTERN = /^hs_opd_(live|test)_[A-Za-z0-9_-]{32}$/;

export function isTenantApiKeySecret(value: string): boolean {
  return SECRET_PATTERN.test(value);
}

export function extractTenantApiKeyPrefix(secret: string): string | null {
  if (!isTenantApiKeySecret(secret)) return null;
  return secret.slice(0, TENANT_API_KEY_PREFIX_LENGTH);
}

export function parseTenantApiKeyEnvironment(secret: string): TenantApiKeyEnvironment | null {
  const match = secret.match(/^hs_opd_(live|test)_/);
  if (!match) return null;
  return match[1] as TenantApiKeyEnvironment;
}

export function generateTenantApiKeySecret(
  environment: TenantApiKeyEnvironment,
): { secret: string; prefix: string } {
  const random = randomBytes(24).toString("base64url").slice(0, SECRET_BODY_LENGTH);
  const secret = `hs_opd_${environment}_${random}`;
  return { secret, prefix: secret.slice(0, TENANT_API_KEY_PREFIX_LENGTH) };
}

export function hashTenantApiKeySecret(secret: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(secret, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyTenantApiKeySecret(secret: string, storedHash: string): boolean {
  const separator = storedHash.indexOf(":");
  if (separator <= 0) return false;
  const saltHex = storedHash.slice(0, separator);
  const hashHex = storedHash.slice(separator + 1);
  if (saltHex.length === 0 || hashHex.length === 0) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }

  const actual = scryptSync(secret, salt, expected.length, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** Visible prefix for user API key lookup (`hs_user_{env}_` + random segment). */
export const USER_API_KEY_PREFIX_LENGTH = 20;

const USER_SECRET_PATTERN = /^hs_user_(live|test)_[A-Za-z0-9_-]{32}$/;

export function isUserApiKeySecret(value: string): boolean {
  return USER_SECRET_PATTERN.test(value);
}

export function extractUserApiKeyPrefix(secret: string): string | null {
  if (!isUserApiKeySecret(secret)) return null;
  return secret.slice(0, USER_API_KEY_PREFIX_LENGTH);
}
