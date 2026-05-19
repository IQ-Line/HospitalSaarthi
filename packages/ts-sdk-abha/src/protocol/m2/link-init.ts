/**
 * M2 — Link initiation (HIP side).
 *
 * After discovery, gateway → HIP `link/init` requesting a link auth. HIP
 * dispatches OTP to the patient's registered mobile and replies via
 * `on-init` with the link reference.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md`
 *     §5.3.6-§5.3.7
 *
 * TODO: dev to populate `LinkInitRequest` (inbound) and
 * `OnLinkInitRequest` (outbound to `/api/hiecm/user-initiated-linking/v3/link/care-context/on-init`:
 * `transactionId`, `link.{referenceNumber, authenticationType, meta}`,
 * and `response.requestId`).
 */

export {};
