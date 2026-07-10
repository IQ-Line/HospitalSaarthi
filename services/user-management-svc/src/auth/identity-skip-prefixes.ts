/**
 * URL path prefixes for which the identity plugin SKIPS user-JWT verification.
 *
 * These routes are not authenticated by a user access token:
 *  - `/api/auth`            — better-auth's own endpoints (login, token, JWKS).
 *  - `/docs`                — swagger UI / OpenAPI JSON.
 *  - `.../auth/api-key`     — tenant API-key auth (validated by its own plugin).
 *  - `.../internal/users`   — the D13 ban-cutoff active-status probe (S2S).
 *  - `.../internal/tenant-entitlement-cache` — Configurator→UM cache bust (S2S).
 *
 * The two `internal/*` subtrees self-gate on `x-um-internal-key`; identity must
 * step aside or the handler's own key check is never reached (the S2S caller sends
 * the key, not a Bearer token — the identity hook would 401 first).
 *
 * Deliberately NARROW — NOT a blanket `/api/user-management/internal`. The sibling
 * `internal/module-entitlements` and `internal/runtime-capability-catalog*` routes
 * are `authMode: "protected"` (real user JWT + Cerbos PEP) and MUST stay verified;
 * a blanket prefix would silently expose them. `internal-route-identity-skip.test.ts`
 * guards both directions.
 */
export const USER_MANAGEMENT_IDENTITY_SKIP_PREFIXES = [
  "/api/auth",
  "/docs",
  "/api/user-management/auth/api-key",
  "/api/user-management/internal/users",
  "/api/user-management/internal/tenant-entitlement-cache",
] as const;
