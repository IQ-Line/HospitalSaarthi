/**
 * Phase 1A — **federated** (OAuth/OIDC) sign-in is **not** a User Management module REST use case.
 * It is configured on **better-auth** in the host service (`1A.7`) via provider plugins and the
 * same `/api/auth/*` surface as local login. This module consumes the resulting JWT only.
 */
export const FEDERATE_LOGIN_PHASE_1A_OWNER = "better-auth" as const;
