/**
 * ABDM gateway error code constants.
 *
 * The ABDM gateway returns coded errors in `error.code` plus a message.
 * This module centralises the codes the platform handles explicitly so
 * Integration Hub, telemetry, and the frontend can branch on the same
 * symbol rather than string-typed magic values.
 *
 * TODO: full catalog. Below is the seed set used by the M1 (Aadhaar OTP)
 * and M2 (user-link) flows. Extend as the platform handles more codes.
 *
 * @see https://sandbox.abdm.gov.in (Error catalogues per endpoint)
 */

export const ABDM_ERROR_CODES = {
  /** Aadhaar OTP request failed at UIDAI. */
  AADHAAR_OTP_DISPATCH_FAILED: 'ABDM-1001',
  /** OTP entered does not match the dispatched value. */
  OTP_MISMATCH: 'ABDM-1002',
  /** Requested ABHA Address alias is taken. */
  ABHA_ADDRESS_ALREADY_EXISTS: 'ABDM-1101',
  /** Patient denied consent in M2 link confirm. */
  LINK_CONSENT_DENIED: 'ABDM-2001',
  /** Gateway upstream timeout/5xx. */
  GATEWAY_UNAVAILABLE: 'ABDM-9001',
} as const;

export type AbdmErrorCode = (typeof ABDM_ERROR_CODES)[keyof typeof ABDM_ERROR_CODES];
