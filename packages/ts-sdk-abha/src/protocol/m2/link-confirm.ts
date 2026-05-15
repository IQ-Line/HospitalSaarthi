/**
 * M2 — Link confirmation (HIP side).
 *
 * After OTP delivered in `link-init`, patient enters it; gateway forwards
 * to HIP via `link/confirm`. HIP validates the OTP and replies via
 * `on-confirm` with the linked careContexts plus a link token.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md`
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/hip/link/care-context/confirm`,
 *      `/api/v3/hiu/patient/care-context/on-confirm`)
 *
 * TODO: dev to populate `LinkConfirmRequest` (inbound) and
 * `OnLinkConfirmPayload` (our reply: `patient.id`, `careContexts[]`).
 */

export {};
