/**
 * M1 — Verification of an existing ABHA Number or Address.
 *
 * Used by frontdesk during registration to confirm a patient's claimed
 * ABHA before linking it to the EMPI record. Triggers an Aadhaar or
 * mobile OTP to the registered authenticator and verifies the response.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m1-abha-v3-apis-creation-verification.md` §"Verify ABHA"
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/abha/verify/v3/abhaNumber/send-otp`,
 *      `/api/v3/abha/verify/v3/abhaNumber/verify-otp`)
 *
 * TODO: dev to populate the verify-send + verify-verify DTO pairs.
 */

export {};
