/**
 * Fidelius encryption helper — Curve25519 ECDH + ChaCha20-Poly1305.
 *
 * Implements `FideliusEncryptor` from `../ports.ts`. The envelope shape is
 * fixed by ABDM; field names live in `@hims/ts-sdk-abha/protocol/common/fidelius`.
 *
 * TODO: port from prod-HIMS `services/fidelius.ts` (`abdi-lims-backed` repo)
 * or use a vetted Node crypto library. Avoid hand-rolling primitives.
 * Key material persistence (private keys, nonces) lives in the session row's
 * `context` JSONB — never in module memory.
 */

export {};
