/**
 * M1 — ABHA login flows.
 *
 * Three authenticator paths the gateway supports for an existing ABHA:
 *   - Aadhaar OTP
 *   - ABHA Number / ABHA Address + mobile OTP
 *   - Password (legacy, rarely used)
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m1-abha-v3-apis-creation-verification.md` §"Login"
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/profile/login/request/auth/init`,
 *      `/api/v3/profile/login/verify`)
 *
 * TODO: dev to populate the auth-init + verify DTO pairs, and the
 * discriminated union of `authMethod` (`AADHAAR_OTP` | `MOBILE_OTP` | `PASSWORD`).
 */

export {};
