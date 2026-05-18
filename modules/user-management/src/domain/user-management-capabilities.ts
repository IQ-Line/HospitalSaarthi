/**
 * Canonical User Management capability keys (Cerbos policies, capability catalog seeds).
 * Format: `um:<resource>:<action>` — see `runtime-capability-vocabulary.md`.
 * Runtime principals resolve capabilities from persisted role composition, never from JWT.
 */
export const UM_USER_CREATE = "um:user:create" as const;
export const UM_USER_READ = "um:user:read" as const;
export const UM_USER_UPDATE = "um:user:update" as const;
export const UM_USER_DEACTIVATE = "um:user:deactivate" as const;
export const UM_ROLE_READ = "um:role:read" as const;
export const UM_ROLE_CREATE = "um:role:create" as const;
export const UM_ROLE_UPDATE = "um:role:update" as const;
export const UM_ROLE_ASSIGN = "um:role:assign" as const;
export const UM_CAPABILITY_READ = "um:capability:read" as const;
