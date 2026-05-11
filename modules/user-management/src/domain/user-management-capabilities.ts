/**
 * Canonical User Management capability strings (Cerbos policies, `role_capabilities.capability` seeds).
 * Runtime principals resolve capabilities **only** from persisted `role_capabilities` (+ projection join), not from JWT.
 */
export const UM_USER_CREATE = "um:user:create" as const;
export const UM_USER_READ = "um:user:read" as const;
export const UM_USER_UPDATE = "um:user:update" as const;
export const UM_USER_DELETE = "um:user:delete" as const;
export const UM_USER_LIST = "um:user:list" as const;
export const UM_ROLE_ASSIGN = "um:role:assign" as const;
