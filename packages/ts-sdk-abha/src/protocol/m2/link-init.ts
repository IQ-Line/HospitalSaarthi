/**
 * M2 — Link initiation (HIP side).
 *
 * After discovery, gateway → HIP `link/init` requesting a link auth. HIP
 * dispatches OTP to the patient's registered mobile and replies via
 * `on-init` with the link reference.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md`
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/hip/link/care-context/init`,
 *      `/api/v3/hiu/patient/care-context/on-init`)
 *
 * TODO: dev to populate `LinkInitRequest` (inbound) and `OnLinkInitPayload`
 * (our reply: `transactionId`, `meta` carrying OTP delivery hint).
 */

export {};
