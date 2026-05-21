/**
 * M2 — Care-context discovery (HIP side).
 *
 * Inbound callback: ABDM gateway → platform asking "do you hold records for
 * this patient?". Platform matches against EMPI and replies via the gateway's
 * `on-discover` endpoint.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md`
 *     §5.3.2-§5.3.3
 *
 * TODO: dev to populate `DiscoveryRequest` (inbound) and `OnDiscoverRequest`
 * (our reply pushed to `/api/hiecm/user-initiated-linking/v3/patient/care-context/on-discover`).
 * Inbound matches the v3 spec's discovery request; the reply lists
 * `patient[].careContexts[]` with reference numbers, or `error` with no
 * `patient` field on no-match.
 */

export {};
