/**
 * M1 — ABHA creation via Mobile / Driving-Licence OTP.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m1-abha-v3-apis-creation-verification.md` §"Enrol by mobile"
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml` (`/api/v3/enrollment/request/otp` with
 *     `txnType=mobile`, then `/api/v3/enrollment/enrol/byMobile`)
 *
 * TODO: dev to populate the DTO pairs for OTP request + verify.
 * Note: mobile-OTP enrolment does NOT create an ABHA Number — it creates a
 * provisional account. ABHA Number creation requires Aadhaar-linked enrolment.
 */

export {};
