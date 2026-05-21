/**
 * ABDM Fidelius (HIP encrypt / HIU decrypt).
 * Ported from NHA-ABDM/ABDM-wrapper `EncryptionService.java` + `DecryptionManager.java`:
 * XOR(nonces) → HKDF salt + GCM IV; ECDH shared secret; AES-256-GCM (ciphertext||tag, base64).
 * @see docs/external/abdm-wrapper-reference/encryption-algorithm.md
 */
import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  type KeyObject,
} from "node:crypto";

/** SPKI prefix for raw 32-byte X25519 public keys (ABDM `keyValue` wire format). */
const X25519_SPKI_PREFIX = Buffer.from("302a300506032b656e032100", "hex");

export function decodeBase64Key(value: string): Buffer {
  return Buffer.from(value.trim(), "base64");
}

/** Normalize ABDM `keyValue` — raw 32-byte Montgomery or 65-byte uncompressed EC. */
export function peerPublicKeyToKeyObject(peerPublicKeyB64: string): KeyObject {
  const bytes = decodeBase64Key(peerPublicKeyB64);
  if (bytes.length === 32) {
    return createPublicKey({
      key: Buffer.concat([X25519_SPKI_PREFIX, bytes]),
      format: "der",
      type: "spki",
    });
  }
  if (bytes.length === 65 && bytes[0] === 0x04) {
    return createPublicKey({
      key: bytes,
      format: "der",
      type: "spki",
    });
  }
  if (bytes.length === 44) {
    return createPublicKey({
      key: bytes,
      format: "der",
      type: "spki",
    });
  }
  throw new Error(
    `Unsupported peer public key length ${bytes.length}; expected 32-byte X25519 or SPKI`,
  );
}

export function exportRawX25519PublicKey(publicKey: KeyObject): string {
  const der = publicKey.export({ format: "der", type: "spki" }) as Buffer;
  return der.subarray(-32).toString("base64");
}

export function exportRawX25519PrivateKey(privateKey: KeyObject): string {
  const der = privateKey.export({ format: "der", type: "pkcs8" }) as Buffer;
  return der.subarray(-32).toString("base64");
}

export function importRawX25519PrivateKey(privateKeyB64: string): KeyObject {
  const raw = decodeBase64Key(privateKeyB64);
  const pkcs8Prefix = Buffer.from("302e020100300506032b656e04220420", "hex");
  return createPrivateKey({
    key: Buffer.concat([pkcs8Prefix, raw]),
    format: "der",
    type: "pkcs8",
  });
}

/** XOR peer + our nonce; first 20 bytes HKDF salt, last 12 bytes AES-GCM IV (ABDM spec). */
export function deriveSaltAndIv(peerNonce: Buffer, ourNonce: Buffer): {
  salt: Buffer;
  iv: Buffer;
} {
  if (peerNonce.length !== 32 || ourNonce.length !== 32) {
    throw new Error("ABDM nonces must be 32 bytes");
  }
  const xored = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    xored[i] = peerNonce[i]! ^ ourNonce[i]!;
  }
  return { salt: xored.subarray(0, 20), iv: xored.subarray(20, 32) };
}

export function deriveAesKey(sharedSecret: Buffer, salt: Buffer): Buffer {
  return Buffer.from(
    hkdfSync("sha256", sharedSecret, salt, Buffer.alloc(0), 32) as ArrayBuffer,
  );
}

export interface EphemeralKeyPair {
  publicKey: KeyObject;
  privateKey: KeyObject;
  ourNonce: Buffer;
  ourPublicKeyB64: string;
  ourNonceB64: string;
  ourPrivateKeyB64: string;
}

export function generateEphemeralX25519(): EphemeralKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("x25519");
  const ourNonce = randomBytes(32);
  return {
    publicKey,
    privateKey,
    ourNonce,
    ourPublicKeyB64: exportRawX25519PublicKey(publicKey),
    ourNonceB64: ourNonce.toString("base64"),
    ourPrivateKeyB64: exportRawX25519PrivateKey(privateKey),
  };
}

export function encryptPayloadAesGcm(
  plainUtf8: string,
  aesKey: Buffer,
  iv: Buffer,
): Buffer {
  const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
  return Buffer.concat([cipher.update(plainUtf8, "utf8"), cipher.final(), cipher.getAuthTag()]);
}

export function decryptPayloadAesGcm(
  cipherAndTag: Buffer,
  aesKey: Buffer,
  iv: Buffer,
): string {
  if (cipherAndTag.length < 16) {
    throw new Error("Ciphertext too short for AES-GCM");
  }
  const tag = cipherAndTag.subarray(-16);
  const ciphertext = cipherAndTag.subarray(0, -16);
  const decipher = createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** HIP encrypt path: ECDH(ourPriv, peerPub) per ABDM data-flow guidelines. */
export function encryptForPeerMaterial(input: {
  payloadJson: string;
  peerPublicKey: string;
  peerNonce: string;
}): {
  encryptedPayload: string;
  ourPublicKey: string;
  ourNonce: string;
  ourPrivateKey: string;
} {
  const ephemeral = generateEphemeralX25519();
  const peerPub = peerPublicKeyToKeyObject(input.peerPublicKey);
  const peerNonceBytes = decodeBase64Key(input.peerNonce);
  const sharedSecret = diffieHellman({
    privateKey: ephemeral.privateKey,
    publicKey: peerPub,
  });
  const { salt, iv } = deriveSaltAndIv(peerNonceBytes, ephemeral.ourNonce);
  const aesKey = deriveAesKey(sharedSecret, salt);
  const blob = encryptPayloadAesGcm(input.payloadJson, aesKey, iv);
  return {
    encryptedPayload: blob.toString("base64"),
    ourPublicKey: ephemeral.ourPublicKeyB64,
    ourNonce: ephemeral.ourNonceB64,
    ourPrivateKey: ephemeral.ourPrivateKeyB64,
  };
}

/** One ephemeral key pair per HI push; all entries share HIP keyMaterial. */
export function encryptBundlesForPeer(input: {
  payloadJsons: string[];
  peerPublicKey: string;
  peerNonce: string;
}): {
  encryptedPayloads: string[];
  ourPublicKey: string;
  ourNonce: string;
} {
  const ephemeral = generateEphemeralX25519();
  if (input.payloadJsons.length === 0) {
    return {
      encryptedPayloads: [],
      ourPublicKey: ephemeral.ourPublicKeyB64,
      ourNonce: ephemeral.ourNonceB64,
    };
  }
  const peerPub = peerPublicKeyToKeyObject(input.peerPublicKey);
  const peerNonceBytes = decodeBase64Key(input.peerNonce);
  const sharedSecret = diffieHellman({
    privateKey: ephemeral.privateKey,
    publicKey: peerPub,
  });
  const { salt, iv } = deriveSaltAndIv(peerNonceBytes, ephemeral.ourNonce);
  const aesKey = deriveAesKey(sharedSecret, salt);
  const encryptedPayloads = input.payloadJsons.map((json) =>
    encryptPayloadAesGcm(json, aesKey, iv).toString("base64"),
  );
  return {
    encryptedPayloads,
    ourPublicKey: ephemeral.ourPublicKeyB64,
    ourNonce: ephemeral.ourNonceB64,
  };
}

/** HIU decrypt path (mirror of HIP encrypt). */
export function decryptFromPeerMaterial(input: {
  encryptedPayload: string;
  peerPublicKey: string;
  peerNonce: string;
  ourPrivateKey: string;
  ourNonce: string;
}): string {
  const peerPub = peerPublicKeyToKeyObject(input.peerPublicKey);
  const ourPriv = importRawX25519PrivateKey(input.ourPrivateKey);
  const peerNonceBytes = decodeBase64Key(input.peerNonce);
  const ourNonceBytes = decodeBase64Key(input.ourNonce);
  const sharedSecret = diffieHellman({
    privateKey: ourPriv,
    publicKey: peerPub,
  });
  const { salt, iv } = deriveSaltAndIv(peerNonceBytes, ourNonceBytes);
  const aesKey = deriveAesKey(sharedSecret, salt);
  const cipherBlob = decodeBase64Key(input.encryptedPayload);
  return decryptPayloadAesGcm(cipherBlob, aesKey, iv);
}
