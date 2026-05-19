/**
 * M2 — Proactive care-context publish (HIP → gateway).
 *
 * Outbound: HIP notifies the gateway that new care contexts exist for a
 * previously-linked patient (e.g., a new visit was recorded). Gateway
 * forwards to the patient's consent manager and replies via
 * `/api/v3/links/context/on-notify`.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md`
 *     §4.3.6-§4.3.7
 *
 * TODO: dev to populate `AddContextsRequest` (outbound to
 * `/api/hiecm/hip/v3/link/context/notify`) and `OnAddContextsCallback`
 * (gateway → HIP ack at `/api/v3/links/context/on-notify`).
 */

export {};
