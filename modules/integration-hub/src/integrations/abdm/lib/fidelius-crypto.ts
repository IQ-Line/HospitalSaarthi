/**
 * ABDM Fidelius (HIP encrypt / HIU decrypt).
 * ECDH: BouncyCastle Weierstrass curve25519 (@noble/curves). HKDF + AES-256-GCM: node:crypto.
 * @see docs/external/abdm-wrapper-reference/encryption-algorithm.md
 */
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import {
  curve25519Bc,
  decodePeerPublicKeyPoint,
  ecdhSharedSecretBc,
  exportUncompressedEcPointB64,
  generateEphemeralBcKeyPair,
  importPrivateKey32,
} from "./fidelius-curve25519-bc.js";
import {
  exportKeyToShareSpkiB64,
  normalizePeerPublicKeyToPointB64,
} from "./fidelius-public-key.js";

export function decodeBase64Key(value: string): Buffer {
  return Buffer.from(value.trim(), "base64");
}

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
  ourNonce: Buffer;
  ourPublicKeyB64: string;
  ourNonceB64: string;
  ourPrivateKeyB64: string;
}

export function generateEphemeralX25519(): EphemeralKeyPair {
  const ephemeral = generateEphemeralBcKeyPair();
  const ourNonce = randomBytes(32);
  return {
    ourNonce,
    ourPublicKeyB64: ephemeral.ourPublicKeyB64,
    ourNonceB64: ourNonce.toString("base64"),
    ourPrivateKeyB64: ephemeral.ourPrivateKeyB64,
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

function sharedSecretForEncrypt(
  ourPrivateKeyB64: string,
  peerPublicKeyB64: string,
): Buffer {
  const ourPriv = importPrivateKey32(ourPrivateKeyB64);
  const peerPointB64 = normalizePeerPublicKeyToPointB64(peerPublicKeyB64);
  const peerPoint = decodePeerPublicKeyPoint(peerPointB64);
  return ecdhSharedSecretBc(ourPriv, peerPoint);
}

/** HIP encrypt path: ECDH(HIP_priv, HIU_pub) per ABDM data-flow guidelines. */
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
  const ephemeral = generateEphemeralBcKeyPair();
  const ourNonce = randomBytes(32);
  const peerNonceBytes = decodeBase64Key(input.peerNonce);
  const sharedSecret = sharedSecretForEncrypt(
    ephemeral.ourPrivateKeyB64,
    input.peerPublicKey,
  );
  const { salt, iv } = deriveSaltAndIv(peerNonceBytes, ourNonce);
  const aesKey = deriveAesKey(sharedSecret, salt);
  const blob = encryptPayloadAesGcm(input.payloadJson, aesKey, iv);
  return {
    encryptedPayload: blob.toString("base64"),
    ourPublicKey: exportKeyToShareSpkiB64(ephemeral.ourPublicKeyB64),
    ourNonce: ourNonce.toString("base64"),
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
  const ephemeral = generateEphemeralBcKeyPair();
  const ourNonce = randomBytes(32);
  if (input.payloadJsons.length === 0) {
    return {
      encryptedPayloads: [],
      ourPublicKey: exportKeyToShareSpkiB64(ephemeral.ourPublicKeyB64),
      ourNonce: ourNonce.toString("base64"),
    };
  }
  const peerNonceBytes = decodeBase64Key(input.peerNonce);
  const sharedSecret = sharedSecretForEncrypt(
    ephemeral.ourPrivateKeyB64,
    input.peerPublicKey,
  );
  const { salt, iv } = deriveSaltAndIv(peerNonceBytes, ourNonce);
  const aesKey = deriveAesKey(sharedSecret, salt);
  const encryptedPayloads = input.payloadJsons.map((json) =>
    encryptPayloadAesGcm(json, aesKey, iv).toString("base64"),
  );
  return {
    encryptedPayloads,
    ourPublicKey: exportKeyToShareSpkiB64(ephemeral.ourPublicKeyB64),
    ourNonce: ourNonce.toString("base64"),
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
  const ourPriv = importPrivateKey32(input.ourPrivateKey);
  const peerPointB64 = normalizePeerPublicKeyToPointB64(input.peerPublicKey);
  const peerPoint = decodePeerPublicKeyPoint(peerPointB64);
  const peerNonceBytes = decodeBase64Key(input.peerNonce);
  const ourNonceBytes = decodeBase64Key(input.ourNonce);
  const sharedSecret = ecdhSharedSecretBc(ourPriv, peerPoint);
  const { salt, iv } = deriveSaltAndIv(peerNonceBytes, ourNonceBytes);
  const aesKey = deriveAesKey(sharedSecret, salt);
  const cipherBlob = decodeBase64Key(input.encryptedPayload);
  return decryptPayloadAesGcm(cipherBlob, aesKey, iv);
}

/** Deterministic encrypt for test vectors (fixed HIP private + nonce). */
export function encryptForPeerMaterialDeterministic(input: {
  payloadJson: string;
  hipPrivateKeyB64: string;
  hipNonceB64: string;
  peerPublicKey: string;
  peerNonce: string;
}): { encryptedPayload: string; ourPublicKey: string; ourNonce: string } {
  const hipPriv = importPrivateKey32(input.hipPrivateKeyB64);
  const ourNonce = decodeBase64Key(input.hipNonceB64);
  const ourPublicKeyB64 = exportUncompressedEcPointB64(hipPriv);
  const sharedSecret = sharedSecretForEncrypt(input.hipPrivateKeyB64, input.peerPublicKey);
  const { salt, iv } = deriveSaltAndIv(decodeBase64Key(input.peerNonce), ourNonce);
  const aesKey = deriveAesKey(sharedSecret, salt);
  const blob = encryptPayloadAesGcm(input.payloadJson, aesKey, iv);
  return {
    encryptedPayload: blob.toString("base64"),
    ourPublicKey: exportKeyToShareSpkiB64(ourPublicKeyB64),
    ourNonce: input.hipNonceB64,
  };
}

export { curve25519Bc };
