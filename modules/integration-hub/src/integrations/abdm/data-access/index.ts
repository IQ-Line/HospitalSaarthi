/**
 * Data-access barrel for the ABDM integration in `@hims/integration-hub`.
 *
 * Concretions implementing the ports defined in `../ports.ts`:
 *   - `DrizzleAbdmSessionsRepo`   — PG persistence for `abdm_sessions`.
 *   - `HttpGatewayClient`         — outbound to gateway with auth + REQUEST-ID.
 *   - `Fidelius`                  — Curve25519 + ChaCha20-Poly1305 helper.
 *
 * The service entry (`services/integration-hub-svc`) instantiates these once and
 * threads them through `createRouter`. Tests construct fakes by implementing
 * the port interface directly.
 */

export {};
