/**
 * Runtime capability keys (Cerbos / UM catalog vocabulary).
 * Import from here — do not duplicate string literals in feature code.
 * Keys mirror Master Data `modules.slug` sync (`users:users:read`, …).
 */

export const UM_USER_CREATE = 'users:users:create' as const;
export const UM_USER_READ = 'users:users:read' as const;
export const UM_USER_UPDATE = 'users:users:update' as const;
export const UM_USER_DELETE = 'users:users:delete' as const;

export const UM_ROLE_READ = 'user-roles:user-roles:read' as const;
export const UM_ROLE_CREATE = 'user-roles:user-roles:create' as const;
export const UM_ROLE_UPDATE = 'user-roles:user-roles:update' as const;
export const UM_ROLE_DELETE = 'user-roles:user-roles:delete' as const;
export const UM_ROLE_ASSIGN = 'user-roles:role:assign' as const;

export const UM_CAPABILITY_READ = 'user-capabilities:user-capabilities:read' as const;

export const MD_VISITPAD_VIEW = 'visitpad-templates:visitpad:view' as const;
export const MD_VISITPAD_CREATE = 'visitpad-templates:visitpad:create' as const;
export const MD_VISITPAD_CATALOG_READ = 'visitpad-templates:catalog:read' as const;
export const MD_VISITPAD_UPDATE = 'visitpad-templates:catalog:update' as const;
export const MD_VISITPAD_DELETE = 'visitpad-templates:catalog:delete' as const;

/** Visitpad shell: view catalog or create entries (matches nav manifest OR gate). */
export const MD_VISITPAD_ACCESS_ANY = [MD_VISITPAD_VIEW, MD_VISITPAD_CREATE] as const;

export const MD_VISITPAD_MUTATE_ANY = [
  MD_VISITPAD_CREATE,
  MD_VISITPAD_UPDATE,
  MD_VISITPAD_DELETE,
] as const;

export const MD_SHELL_ACCESS = 'master-data:shell:access' as const;
export const CFG_SHELL_ACCESS = 'configurator:shell:access' as const;
export const FD_SHELL_ACCESS = 'frontdesk:shell:access' as const;
export const FD_REGISTRATION_READ = 'registration:registration:read' as const;

export const BILLING_SHELL_ACCESS = 'billing-and-finance:shell:access' as const;
export const BILLING_INVOICE_READ = 'invoice:invoice:read' as const;
export const BILLING_ACCOUNT_READ = 'billing-account:billing-account:read' as const;
export const BILLING_TARIFF_READ = 'tariff-master:tariff-master:read' as const;

export const BILLING_PRODUCT_ANY = [
  BILLING_SHELL_ACCESS,
  BILLING_INVOICE_READ,
  BILLING_ACCOUNT_READ,
  BILLING_TARIFF_READ,
] as const;

export const UM_USER_WRITE_ANY = [
  UM_USER_CREATE,
  UM_USER_UPDATE,
  UM_USER_DELETE,
] as const;

export const UM_ROLE_WRITE_ANY = [UM_ROLE_CREATE, UM_ROLE_UPDATE, UM_ROLE_DELETE] as const;

export const UM_USERS_SECTION_ANY = [UM_USER_READ, UM_USER_CREATE] as const;

/** User Management module nav + layout (users and/or roles section). */
export const UM_USER_MANAGEMENT_ANY = [
  UM_USER_READ,
  UM_USER_CREATE,
  UM_ROLE_READ,
] as const;

export const UM_ROLES_ADMIN_ANY = [
  UM_ROLE_READ,
  UM_ROLE_CREATE,
  UM_ROLE_UPDATE,
  UM_ROLE_DELETE,
] as const;
