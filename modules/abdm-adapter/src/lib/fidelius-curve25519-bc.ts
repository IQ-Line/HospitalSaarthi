/**
 * BouncyCastle `CustomNamedCurves.getByName("curve25519")` (short Weierstrass, cofactor 8).
 * Uses @noble/curves projective math; avoids noble's prime-subgroup check (BC/NHA points are valid on-curve).
 * @see org.bouncycastle.crypto.ec.CustomNamedCurves#curve25519
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToNumberBE } from "@noble/curves/abstract/utils.js";
import { Field } from "@noble/curves/abstract/modular.js";
import { weierstrass } from "@noble/curves/abstract/weierstrass.js";

const P = BigInt(
  "0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed",
);
const CURVE_ORDER = BigInt(
  "0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed",
);

const Fp = Field(P);

/** Generator from CustomNamedCurves curve25519 basepoint hex. */
const BC_GENERATOR_UNCOMPRESSED = Buffer.from(
  "042AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD245A20AE19A1B8A086B4E01EDD2C7748D14C923D4D7E6D7C61B229E9C5A27ECED3D9",
  "hex",
);

export const curve25519Bc = weierstrass({
  a: BigInt(
    "0x2aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa984914a144",
  ),
  b: BigInt(
    "0x7b425ed097b425ed097b425ed097b425ed097b425ed097b4260b5e9c7710c864",
  ),
  Fp,
  n: CURVE_ORDER,
  Gx: BigInt(
    "0x2aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaad245a",
  ),
  Gy: BigInt(
    "0x20ae19a1b8a086b4e01edd2c7748d14c923d4d7e6d7c61b229e9c5a27eced3d9",
  ),
  h: BigInt(8),
  hash: sha256,
});

const Point = curve25519Bc.Point;
const BASE_POINT = pointFromUncompressed(BC_GENERATOR_UNCOMPRESSED);

function pointFromUncompressed(bytes: Uint8Array | Buffer) {
  const b = bytes instanceof Buffer ? bytes : Buffer.from(bytes);
  if (b.length !== 65 || b[0] !== 0x04) {
    throw new Error(`Expected 65-byte uncompressed EC point; got ${b.length}`);
  }
  const x = Fp.fromBytes(b.subarray(1, 33));
  const y = Fp.fromBytes(b.subarray(33, 65));
  return Point.fromAffine({ x, y });
}

function affineToUncompressedBytes(point: ReturnType<typeof Point.fromAffine>): Buffer {
  const { x, y } = point.toAffine();
  const out = Buffer.alloc(65);
  out[0] = 0x04;
  out.set(Fp.toBytes(x), 1);
  out.set(Fp.toBytes(y), 33);
  return out;
}

/** Scalar from private key bytes (Java `new BigInteger(d)` mod n). */
function scalarFromPrivateBytes(raw: Uint8Array): bigint {
  let k = bytesToNumberBE(raw) % CURVE_ORDER;
  if (k === 0n) {
    throw new Error("Invalid zero private key scalar");
  }
  return k;
}

export function decodePeerPublicKeyPoint(peerPublicKeyB64: string): Uint8Array {
  const bytes = Buffer.from(peerPublicKeyB64.trim(), "base64");
  if (bytes.length !== 65 || bytes[0] !== 0x04) {
    throw new Error(
      `ABDM peer keyValue must be 65-byte uncompressed EC point (0x04 prefix); got ${bytes.length} bytes`,
    );
  }
  return new Uint8Array(bytes);
}

/** True when keyValue decodes to a valid BC CustomNamedCurves curve25519 point. */
export function isValidBcCurve25519PublicKeyB64(peerPublicKeyB64: string): boolean {
  try {
    const bytes = Buffer.from(peerPublicKeyB64.trim(), "base64");
    if (bytes.length !== 65 || bytes[0] !== 0x04) return false;
    const x = Fp.fromBytes(bytes.subarray(1, 33));
    const y = Fp.fromBytes(bytes.subarray(33, 65));
    Point.fromAffine({ x, y }).assertValidity();
    return true;
  } catch {
    return false;
  }
}

export function exportUncompressedEcPointB64(privateKey32: Uint8Array): string {
  const pub = BASE_POINT.multiplyUnsafe(scalarFromPrivateBytes(privateKey32));
  return affineToUncompressedBytes(pub).toString("base64");
}

/** ECDH shared secret (x-coordinate of shared point, 32 bytes — matches Java `KeyAgreement.generateSecret`). */
export function ecdhSharedSecretBc(
  ourPrivateKey32: Uint8Array,
  peerPoint65: Uint8Array,
): Buffer {
  const peer = pointFromUncompressed(peerPoint65);
  const shared = peer.multiplyUnsafe(scalarFromPrivateBytes(ourPrivateKey32));
  return Buffer.from(Fp.toBytes(shared.toAffine().x));
}

export function generateEphemeralBcKeyPair(): {
  privateKey32: Uint8Array;
  ourPrivateKeyB64: string;
  ourPublicKeyB64: string;
} {
  const privateKey32 = new Uint8Array(32);
  crypto.getRandomValues(privateKey32);
  return {
    privateKey32,
    ourPrivateKeyB64: Buffer.from(privateKey32).toString("base64"),
    ourPublicKeyB64: exportUncompressedEcPointB64(privateKey32),
  };
}

export function importPrivateKey32(privateKeyB64: string): Uint8Array {
  const raw = Buffer.from(privateKeyB64.trim(), "base64");
  if (raw.length === 0 || raw.length > 34) {
    throw new Error(`ABDM Fidelius private key invalid length ${raw.length}`);
  }
  return new Uint8Array(raw);
}
