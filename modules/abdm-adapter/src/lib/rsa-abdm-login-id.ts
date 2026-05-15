import { createHash, createPublicKey, constants, publicEncrypt } from "node:crypto";

/**
 * RSA-OAEP (SHA-1 / MGF1) encryption for NHA `loginId` fields, matching
 * `RSA/ECB/OAEPWithSHA-1AndMGF1Padding` from the integrator guide.
 *
 * @param publicKeyBase64DerSpki — `publicKey` from `/v3/profile/public/certificate` (base64 DER SPKI).
 * @returns Base64 ciphertext (what NHA expects in JSON `loginId`).
 */
export function encryptLoginIdWithAbdmPublicKey(
  publicKeyBase64DerSpki: string,
  loginIdUtf8: string,
): string {
  const der = Buffer.from(publicKeyBase64DerSpki, "base64");
  const key = createPublicKey({ key: der, format: "der", type: "spki" });
  const encrypted = publicEncrypt(
    {
      key,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha1",
    },
    Buffer.from(loginIdUtf8, "utf8"),
  );
  return encrypted.toString("base64");
}

/** Short stable fingerprint for logs / diagnostics (not cryptographic identity). */
export function publicKeyFingerprint(publicKeyBase64: string): string {
  return createHash("sha256").update(publicKeyBase64, "utf8").digest("hex").slice(0, 16);
}
