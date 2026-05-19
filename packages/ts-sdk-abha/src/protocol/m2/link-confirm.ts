/**
 * M2 — Link confirmation (HIP side).
 *
 * After OTP delivered in `link-init`, patient enters it; gateway forwards
 * to HIP via `link/confirm`. HIP validates the OTP and replies via a
 * separate outbound `on-confirm` POST with linked careContexts.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md`
 *     §5.3.10-§5.3.11
 *
 * TODO: dev to populate `LinkConfirmRequest` (inbound:
 * `confirmation.{token, linkRefNumber}`) and `OnLinkConfirmRequest`
 * (outbound to `/api/hiecm/user-initiated-linking/v3/link/care-context/on-confirm`:
 * `patient[]` plus `response.requestId`, no `transactionId`).
 */

export {};
