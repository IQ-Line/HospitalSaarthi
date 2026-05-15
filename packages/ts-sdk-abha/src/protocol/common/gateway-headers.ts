/**
 * Common request/response headers used across ABDM gateway calls.
 *
 * Includes `Authorization` bearer token (session token from `/sessions`),
 * `X-CM-ID` (consent manager id, e.g. `sbx`), `X-HIP-ID` / `X-HIU-ID` per
 * milestone, `REQUEST-ID` (UUID, idempotency), and `TIMESTAMP` (ISO-8601).
 *
 * TODO: dev to lock the header shape from
 * `docs/external/abdm-wrapper/docs/wrapperV3.yaml` `securitySchemes` and
 * the per-endpoint `parameters[in=header]` sections.
 */

export {};
