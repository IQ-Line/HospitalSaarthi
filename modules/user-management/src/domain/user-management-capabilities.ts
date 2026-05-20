/**
 * User Management capability keys aligned with Master Data catalog module slugs.
 * Synced via `module_permissions` → `users:users:read`, `user-roles:user-roles:create`, etc.
 */
export const UM_USER_CREATE = "users:users:create" as const;
export const UM_USER_READ = "users:users:read" as const;
export const UM_USER_UPDATE = "users:users:update" as const;
/** Maps to Master Data `delete` on module `users` (Cerbos action `user.deactivate`). */
export const UM_USER_DELETE = "users:users:delete" as const;
export const UM_ROLE_READ = "user-roles:user-roles:read" as const;
export const UM_ROLE_CREATE = "user-roles:user-roles:create" as const;
export const UM_ROLE_UPDATE = "user-roles:user-roles:update" as const;
export const UM_ROLE_DELETE = "user-roles:user-roles:delete" as const;
export const UM_ROLE_ASSIGN = "user-roles:role:assign" as const;
export const UM_CAPABILITY_READ = "user-capabilities:user-capabilities:read" as const;
