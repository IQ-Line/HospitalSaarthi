/**
 * Phase 1A — **local** (password, username, MFA hooks) interactive authentication is **not** exposed
 * on User Management REST. It is implemented by **better-auth** in the host service (`1A.7`):
 * `/api/auth/*` routes, session cookies, and JWKS-backed access tokens verified by
 * `{@link @hims/ts-sdk-identity}` before this module’s protected handlers run.
 *
 * Multi-tenant flows (tenant picker using `auth_user_id` / `findUserByGlobalId`) belong in a BFF or
 * future OpenAPI operations once specified.
 */
export const AUTHENTICATE_LOCAL_PHASE_1A_OWNER = "better-auth" as const;
