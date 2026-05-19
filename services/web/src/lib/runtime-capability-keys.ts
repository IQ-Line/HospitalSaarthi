/**
 * Runtime capability keys (Cerbos / UM catalog vocabulary).
 * Import from here — do not duplicate string literals in feature code.
 */

export const UM_USER_CREATE = 'um:user:create' as const;
export const UM_USER_READ = 'um:user:read' as const;
export const UM_USER_UPDATE = 'um:user:update' as const;
export const UM_USER_DEACTIVATE = 'um:user:deactivate' as const;

export const UM_ROLE_READ = 'um:role:read' as const;
export const UM_ROLE_CREATE = 'um:role:create' as const;
export const UM_ROLE_UPDATE = 'um:role:update' as const;
export const UM_ROLE_DELETE = 'um:role:delete' as const;
export const UM_ROLE_ASSIGN = 'um:role:assign' as const;

export const UM_CAPABILITY_READ = 'um:capability:read' as const;

export const MD_VISITPAD_VIEW = 'md:visitpad:view' as const;
export const MD_VISITPAD_CREATE = 'md:visitpad:create' as const;
export const MD_VISITPAD_UPDATE = 'md:visitpad:update' as const;
export const MD_VISITPAD_DELETE = 'md:visitpad:delete' as const;

export const MD_VISITPAD_MUTATE_ANY = [
  MD_VISITPAD_CREATE,
  MD_VISITPAD_UPDATE,
  MD_VISITPAD_DELETE,
] as const;

/** Shell nav until module-specific keys exist in catalog (grant on principal for nav). */
export const MD_SHELL_ACCESS = 'md:shell:access' as const;
export const CFG_SHELL_ACCESS = 'cfg:shell:access' as const;
export const FD_SHELL_ACCESS = 'fd:shell:access' as const;

export const UM_USER_WRITE_ANY = [
  UM_USER_CREATE,
  UM_USER_UPDATE,
  UM_USER_DEACTIVATE,
] as const;

export const UM_ROLE_WRITE_ANY = [UM_ROLE_CREATE, UM_ROLE_UPDATE, UM_ROLE_DELETE] as const;

export const UM_USERS_SECTION_ANY = [UM_USER_READ, UM_USER_CREATE] as const;

export const UM_ROLES_ADMIN_ANY = [
  UM_ROLE_READ,
  UM_ROLE_CREATE,
  UM_ROLE_UPDATE,
  UM_ROLE_DELETE,
] as const;
