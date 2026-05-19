/**
 * NHA ABHA API — public encryption certificate (M1 enrolment / verification).
 *
 * @see docs/external/abdm/v3-m1-abha-v3-apis-creation-verification.md
 */
export interface NhaPublicCertificateResponse {
  publicKey: string;
  encryptionAlgorithm: string;
}
