import {
  DEVELOPMENT_BOOTSTRAP_CREDENTIALS,
  DEVELOPMENT_BOOTSTRAP_ORG_ID,
  DEVELOPMENT_BOOTSTRAP_ORG_SLUG,
  DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
  DEVELOPMENT_BOOTSTRAP_ROLE_ID,
  DEVELOPMENT_BOOTSTRAP_TENANT_ID,
  DEVELOPMENT_BOOTSTRAP_TENANT_SLUG,
  DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
  DEVELOPMENT_BOOTSTRAP_USER_ID,
  DEVELOPMENT_BOOTSTRAP_USER_NAME,
  DEVELOPMENT_BOOTSTRAP_USER_PASSWORD,
  DEVELOPMENT_BOOTSTRAP_USER_USERNAME,
} from "../../packages/dev-bootstrap/src/index.ts";

export {
  DEVELOPMENT_BOOTSTRAP_CREDENTIALS,
  DEVELOPMENT_BOOTSTRAP_ORG_ID,
  DEVELOPMENT_BOOTSTRAP_ORG_SLUG,
  DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
  DEVELOPMENT_BOOTSTRAP_ROLE_ID,
  DEVELOPMENT_BOOTSTRAP_TENANT_ID,
  DEVELOPMENT_BOOTSTRAP_TENANT_SLUG,
  DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
  DEVELOPMENT_BOOTSTRAP_USER_ID,
  DEVELOPMENT_BOOTSTRAP_USER_NAME,
  DEVELOPMENT_BOOTSTRAP_USER_PASSWORD,
  DEVELOPMENT_BOOTSTRAP_USER_USERNAME,
};

export const DEV_TENANT_ID = DEVELOPMENT_BOOTSTRAP_TENANT_ID;
export const DEV_ORG_ID = DEVELOPMENT_BOOTSTRAP_ORG_ID;

/** Module slugs required in `global_master.modules` (Alembic migrations + `make db-migrate`). */
export const DEMO_CATALOG_MODULE_SLUGS = [
  "user-management",
  "configurator",
  "empi",
  "master-data",
  "visitpad-templates",
  "frontdesk",
  "opd",
] as const;

export type SeedCapabilityDef = {
  capability_key: string;
  module: string;
  feature: string;
  action: string;
  display_name: string;
  source_permission_slug: string;
};

export const SEED_CAPABILITIES: readonly SeedCapabilityDef[] = [
  { capability_key: "um:user:create", module: "user-management", feature: "users", action: "create", display_name: "Create users", source_permission_slug: "user.create" },
  { capability_key: "um:user:read", module: "user-management", feature: "users", action: "read", display_name: "Read users", source_permission_slug: "user.read" },
  { capability_key: "um:user:update", module: "user-management", feature: "users", action: "update", display_name: "Update users", source_permission_slug: "user.update" },
  { capability_key: "um:user:delete", module: "user-management", feature: "users", action: "delete", display_name: "Delete users", source_permission_slug: "user.delete" },
  { capability_key: "um:role:create", module: "user-management", feature: "roles", action: "create", display_name: "Create roles", source_permission_slug: "role.create" },
  { capability_key: "um:role:read", module: "user-management", feature: "roles", action: "read", display_name: "Read roles", source_permission_slug: "role.read" },
  { capability_key: "um:role:update", module: "user-management", feature: "roles", action: "update", display_name: "Update roles", source_permission_slug: "role.update" },
  { capability_key: "um:role:delete", module: "user-management", feature: "roles", action: "delete", display_name: "Delete roles", source_permission_slug: "role.delete" },
  { capability_key: "um:role:assign", module: "user-management", feature: "roles", action: "assign", display_name: "Assign roles", source_permission_slug: "role.assign" },
  { capability_key: "um:capability:read", module: "user-management", feature: "capabilities", action: "read", display_name: "Read capabilities", source_permission_slug: "capability.read" },
  { capability_key: "opd:visit:create", module: "opd", feature: "visit", action: "create", display_name: "Create OPD visit", source_permission_slug: "opd.visit.create" },
  { capability_key: "opd:visit:read", module: "opd", feature: "visit", action: "read", display_name: "Read OPD visit", source_permission_slug: "opd.visit.read" },
  { capability_key: "opd:patient:read", module: "opd", feature: "patient", action: "read", display_name: "Read OPD patient", source_permission_slug: "opd.patient.read" },
  { capability_key: "md:shell:access", module: "master-data", feature: "shell", action: "access", display_name: "Master Data shell", source_permission_slug: "md.shell.access" },
  { capability_key: "md:visitpad:view", module: "master-data", feature: "visitpad", action: "view", display_name: "Visitpad view", source_permission_slug: "md.visitpad.view" },
  { capability_key: "md:visitpad:create", module: "master-data", feature: "visitpad", action: "create", display_name: "Visitpad create", source_permission_slug: "md.visitpad.create" },
  { capability_key: "cfg:shell:access", module: "configurator", feature: "shell", action: "access", display_name: "Configurator shell", source_permission_slug: "cfg.shell.access" },
  { capability_key: "fd:shell:access", module: "frontdesk", feature: "shell", action: "access", display_name: "Frontdesk shell", source_permission_slug: "fd.shell.access" },
  { capability_key: "empi:patient:read", module: "empi", feature: "patient", action: "read", display_name: "Read patients", source_permission_slug: "empi.patient.read" },
  { capability_key: "empi:patient:create", module: "empi", feature: "patient", action: "create", display_name: "Register patients", source_permission_slug: "empi.patient.create" },
] as const;

const UM_PREFIX = "um:";

export const PLATFORM_OPERATOR_CAPABILITY_KEYS = SEED_CAPABILITIES.map((c) => c.capability_key);

export const TENANT_ADMIN_CAPABILITY_KEYS = SEED_CAPABILITIES.filter(
  (c) =>
    c.capability_key.startsWith(UM_PREFIX) ||
    c.capability_key.includes(":shell:") ||
    c.capability_key.startsWith("md:visitpad:"),
).map((c) => c.capability_key);

export const READONLY_CAPABILITY_KEYS = [
  "um:user:read",
  "um:role:read",
  "um:capability:read",
  "opd:visit:read",
  "opd:patient:read",
  "md:shell:access",
  "md:visitpad:view",
  "cfg:shell:access",
  "fd:shell:access",
  "empi:patient:read",
] as const;

export const CLINICAL_CAPABILITY_KEYS = [
  "opd:visit:create",
  "opd:visit:read",
  "opd:patient:read",
  "fd:shell:access",
  "md:shell:access",
  "empi:patient:read",
  "empi:patient:create",
] as const;

/** Tenant module slugs enabled for the dev hospital (Configurator tenant_modules). */
export const CONFIGURATOR_ENABLED_MODULE_SLUGS = [
  "user-management",
  "configurator",
  "visitpad-templates",
  "frontdesk",
  "empi",
  "master-data",
  "opd",
] as const;
