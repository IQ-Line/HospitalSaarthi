/**
 * Fidelius encryption envelope types — Curve25519 + ChaCha20-Poly1305.
 *
 * ABDM mandates this envelope shape for M2 link/care-context flows and M3
 * health-information transfer. Public keys, nonces, and certificate fingerprints
 * are exchanged as base64. The platform's Fidelius helper (in
 * `modules/abdm-adapter/data-access/fidelius.ts`) consumes/produces these shapes.
 *
 * TODO: dev to derive exact field set from
 * `docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md`
 * and from the reference NHA wrapper at `docs/external/abdm-wrapper/`.
 */

export {};
