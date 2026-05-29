/**
 * Fidelius public-key wire normalization (raw 65-byte EC point ↔ X509/SPKI keyToShare).
 * SPKI prefix matches BouncyCastle `ECPublicKey.getEncoded()` for CustomNamedCurves curve25519.
 * @see tools/fidelius-java-vector/src/main/java/FideliusKeyToShare.java
 */
import { isValidBcCurve25519PublicKeyB64 } from "./fidelius-curve25519-bc.js";

/** Fixed SubjectPublicKeyInfo prefix for BC curve25519 (244 bytes before the 65-byte point). */
const CURVE25519_BC_SPKI_PREFIX = Buffer.from(
  "308201313081ea06072a8648ce3d02013081de020101302b06072a8648ce3d010102207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed304404202aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa984914a14404207b425ed097b425ed097b425ed097b425ed097b425ed097b4260b5e9c7710c8640441042aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaad245a20ae19a1b8a086b4e01edd2c7748d14c923d4d7e6d7c61b229e9c5a27eced3d902201000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed020108034200",
  "hex",
);

const RAW_EC_POINT_LENGTH = 65;
const RAW_EC_POINT_PREFIX = 0x04;

/** True when value is X509/SPKI keyToShare (certified Fidelius sidecar output), not raw EC point. */
export function isSpkiKeyToShareB64(b64: string): boolean {
  const trimmed = b64.trim();
  if (!trimmed.startsWith("MIIB")) return false;
  try {
    const bytes = Buffer.from(trimmed, "base64");
    return bytes.length > RAW_EC_POINT_LENGTH && extractPointFromSpkiDer(bytes) !== null;
  } catch {
    return false;
  }
}

/** Accept raw 65-byte uncompressed EC point or SPKI keyToShare → raw point base64. */
export function normalizePeerPublicKeyToPointB64(b64: string): string {
  const bytes = Buffer.from(b64.trim(), "base64");
  if (bytes.length === RAW_EC_POINT_LENGTH && bytes[0] === RAW_EC_POINT_PREFIX) {
    if (!isValidBcCurve25519PublicKeyB64(b64)) {
      throw new Error(
        "ABDM peer keyValue is a 65-byte EC point but not valid on BC curve25519",
      );
    }
    return bytes.toString("base64");
  }

  const point = extractPointFromSpkiDer(bytes);
  if (!point) {
    throw new Error(
      "ABDM peer keyValue must be 65-byte uncompressed EC point or X509/SPKI keyToShare",
    );
  }
  const pointB64 = point.toString("base64");
  if (!isValidBcCurve25519PublicKeyB64(pointB64)) {
    throw new Error("SPKI keyToShare does not decode to a valid BC curve25519 point");
  }
  return pointB64;
}

/** Export raw 65-byte uncompressed EC point as Fidelius keyToShare (X509/SPKI DER base64). */
export function exportKeyToShareSpkiB64(uncompressedPointB64: string): string {
  const point = Buffer.from(uncompressedPointB64.trim(), "base64");
  if (point.length !== RAW_EC_POINT_LENGTH || point[0] !== RAW_EC_POINT_PREFIX) {
    throw new Error(
      `exportKeyToShareSpkiB64 requires 65-byte uncompressed EC point; got ${point.length} bytes`,
    );
  }
  if (!isValidBcCurve25519PublicKeyB64(uncompressedPointB64)) {
    throw new Error("Cannot export SPKI keyToShare from invalid curve25519 point");
  }
  return Buffer.concat([CURVE25519_BC_SPKI_PREFIX, point]).toString("base64");
}

/** True for raw 65-byte point or SPKI keyToShare on BC curve25519. */
export function isValidFideliusPublicKeyB64(b64: string): boolean {
  try {
    normalizePeerPublicKeyToPointB64(b64);
    return true;
  } catch {
    return false;
  }
}

function extractPointFromSpkiDer(spki: Buffer): Buffer | null {
  if (spki.length < RAW_EC_POINT_LENGTH) return null;

  const tail = spki.subarray(spki.length - RAW_EC_POINT_LENGTH);
  if (tail[0] !== RAW_EC_POINT_PREFIX) return null;

  if (spki.length === CURVE25519_BC_SPKI_PREFIX.length + RAW_EC_POINT_LENGTH) {
    const prefix = spki.subarray(0, CURVE25519_BC_SPKI_PREFIX.length);
    if (prefix.equals(CURVE25519_BC_SPKI_PREFIX)) {
      return Buffer.from(tail);
    }
  }

  const idx = spki.lastIndexOf(RAW_EC_POINT_PREFIX);
  if (idx >= 0 && idx + RAW_EC_POINT_LENGTH === spki.length) {
    return Buffer.from(spki.subarray(idx, idx + RAW_EC_POINT_LENGTH));
  }

  return null;
}
