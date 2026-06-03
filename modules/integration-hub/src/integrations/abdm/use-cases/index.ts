/**
 * Use-case barrel for the ABDM integration in `@hims/integration-hub`.
 *
 * Use-cases are pure functions: `(input, deps: AbdmAdapterDeps) => Promise<Result>`.
 * No global state; no direct DB writes (always via `deps.sessions`); no
 * direct outbound HTTP (always via `deps.gateway`). The discipline that
 * makes these portable into FSM side-effects later.
 *
 * Subfolders mirror the v3 milestones — fill in flow by flow.
 */

export { enrolAadhaarOtpRequest } from "./m1/enrol-aadhaar-otp-request.js";
