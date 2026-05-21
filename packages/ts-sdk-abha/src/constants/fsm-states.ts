/**
 * ABDM FSM state-name constants.
 *
 * Mirrors the state diagrams in
 * `docs/architecture/lld/integration-platform/02-fsm-specifications.md`.
 *
 * One source of truth for telemetry counters, frontend status pills, and
 * audit log enums. The FSM engine itself reads its transitions from a
 * separate machine-readable definition (per ADR-0020); this constant exists
 * so consumers don't string-type the names.
 *
 * @see docs/architecture/adr/0020-fsm-orchestration-for-integration-hub.md
 * @see docs/architecture/lld/integration-platform/02-fsm-specifications.md
 */

/** `abdm.m1.aadhaar-otp.v1` — ABHA creation via Aadhaar OTP (+ enrol-chain mobile verify). */
export const M1_AADHAAR_OTP_STATES = [
  'INIT',
  'AADHAAR_OTP_REQUESTED',
  'ABHA_CREATED',
  'MOBILE_OTP_REQUESTED',
  'MOBILE_OTP_VERIFIED',
  'ADDRESS_CREATED',
  'LINKED',
  'FAILED',
] as const;

/** Shared OTP states for login and verify-existing flows. */
export const M1_SIMPLE_OTP_STATES = [
  'INIT',
  'OTP_REQUESTED',
  'OTP_VERIFIED',
  'LINKED',
  'FAILED',
] as const;

/** `abdm.m2.hip-initiated-link.v1` — staff links known ABHA + care contexts. */
export const M2_HIP_INITIATED_LINK_STATES = [
  'INIT',
  'TOKEN_REQUESTED',
  'TOKEN_AVAILABLE',
  'CC_LINK_REQUESTED',
  'CC_LINK_CONFIRMED',
  'LINKED',
  'FAILED',
] as const;

/** `abdm.m2.consent-notify.v1` — HIP receives consent artefact from gateway. */
export const M2_CONSENT_NOTIFY_STATES = [
  'CONSENT_NOTIFIED',
  'CONSENT_PERSISTED',
  'ACKED',
  'FAILED',
] as const;

/** `abdm.m2.add-contexts.v1` — notify gateway of new care context for linked patient. */
export const M2_ADD_CONTEXTS_STATES = [
  'INIT',
  'NOTIFIED',
  'COMPLETED',
  'FAILED',
] as const;

/** `abdm.m2.sms-notify.v1` — optional SMS nudge via gateway. */
export const M2_SMS_NOTIFY_STATES = [
  'INIT',
  'SMS_REQUESTED',
  'SMS_ACKED',
  'FAILED',
] as const;

/** `abdm.m2.user-initiated-link.v1` — patient links from PHR app. */
export const M2_USER_LINK_STATES = [
  'DISCOVERY_RECEIVED',
  'PATIENT_MATCHED',
  'NO_MATCH',
  'CONTEXTS_LISTED',
  'ON_DISCOVER_RESPONDED',
  'LINK_INIT_RECEIVED',
  'OTP_DISPATCHED',
  'LINK_CONFIRMED',
  'CONTEXTS_PUBLISHED',
  'LINKED',
  'FAILED',
] as const;

/** `abdm.m3.hip.v1` — HIP serves records under consent. */
export const M3_HIP_STATES = [
  'CONSENT_NOTIFIED',
  'CONSENT_PERSISTED',
  'CONSENT_REVOKED',
  'AWAITING_DATA_REQUEST',
  'DATA_REQUESTED',
  'KEYS_EXCHANGED',
  'BUNDLES_FETCHED',
  'BUNDLES_ENCRYPTED',
  'BUNDLES_PUSHED',
  'ACKNOWLEDGED',
  'FAILED',
] as const;

/** `abdm.m3.hiu.v1` — platform fetches external records. */
export const M3_HIU_STATES = [
  'CONSENT_INIT_REQUESTED',
  'AWAITING_PATIENT_APPROVAL',
  'CONSENT_GRANTED',
  'CONSENT_DENIED',
  'EXPIRED',
  'DATA_REQUESTED',
  'AWAITING_PUSH',
  'BUNDLES_RECEIVED',
  'BUNDLES_DECRYPTED',
  'RECORDS_INGESTED',
  'ACKNOWLEDGED',
] as const;

/** `abdm.consent.lifecycle.v1` — long-lived consent supervisor. */
export const CONSENT_LIFECYCLE_STATES = [
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
  'EXHAUSTED',
  'ERASURE_TRIGGERED',
] as const;

export type M1AadhaarOtpState = (typeof M1_AADHAAR_OTP_STATES)[number];
export type M1SimpleOtpState = (typeof M1_SIMPLE_OTP_STATES)[number];
export type M1SessionState = M1AadhaarOtpState | M1SimpleOtpState;
export type M2HipInitiatedLinkState = (typeof M2_HIP_INITIATED_LINK_STATES)[number];
export type M2ConsentNotifyState = (typeof M2_CONSENT_NOTIFY_STATES)[number];
export type M2AddContextsState = (typeof M2_ADD_CONTEXTS_STATES)[number];
export type M2SmsNotifyState = (typeof M2_SMS_NOTIFY_STATES)[number];
export type M2UserLinkState = (typeof M2_USER_LINK_STATES)[number];
export type M3HipState = (typeof M3_HIP_STATES)[number];
export type M3HiuState = (typeof M3_HIU_STATES)[number];
export type ConsentLifecycleState = (typeof CONSENT_LIFECYCLE_STATES)[number];
