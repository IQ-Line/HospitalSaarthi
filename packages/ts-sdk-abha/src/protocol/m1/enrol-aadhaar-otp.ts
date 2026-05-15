/**
 * M1 — ABHA creation via Aadhaar OTP.
 *
 * Flow (FSM `abdm.m1.aadhaar-otp.v1`): `INIT` → `OTP_REQUESTED` → `OTP_VERIFIED`
 * → `ABHA_CREATED` → (optional `ADDRESS_CREATED`) → `LINKED`.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m1-abha-v3-apis-creation-verification.md`
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml` (paths under
 *     `/api/v3/enrollment/request/otp` and `/api/v3/enrollment/enrol/byAadhaar`)
 *
 * TODO: dev to populate the two request/response DTO pairs:
 *   - `EnrolAadhaarOtpRequest`  / `EnrolAadhaarOtpResponse`  (request OTP)
 *   - `EnrolAadhaarVerifyRequest` / `EnrolAadhaarVerifyResponse` (verify + create ABHA)
 *
 * The verify response carries the new ABHA profile (mapped via
 * `@hims/ts-sdk-abha/domain/map-profile-to-patient`) and gateway tokens
 * (`xToken`, `tokens.refresh`) that the platform persists in
 * `abdm_adapter.abdm_sessions` for follow-up profile/card calls.
 */

export {};
