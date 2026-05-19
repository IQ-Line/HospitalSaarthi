/**
 * Runtime capability keys granted to the platform super-admin (dev seed + bootstrap).
 * Cerbos reads snapshots from `user_capabilities`, not live `role_capabilities`.
 */
export const PLATFORM_OPERATOR_CAPABILITY_KEYS = [
  "um:user:create",
  "um:user:read",
  "um:user:update",
  "um:user:delete",
  "um:role:create",
  "um:role:read",
  "um:role:update",
  "um:role:delete",
  "um:role:assign",
  "um:capability:read",
  "opd:visit:create",
  "opd:visit:read",
  "opd:patient:read",
  "md:shell:access",
  "md:visitpad:view",
  "md:visitpad:create",
  "cfg:shell:access",
  "fd:shell:access",
  "empi:patient:read",
  "empi:patient:create",
] as const;
