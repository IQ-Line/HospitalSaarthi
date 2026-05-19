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

export type SeedModuleDef = {
  /** When set, upsert this id when the slug is missing (Alembic may already own the row). */
  id?: string;
  slug: string;
  name: string;
  description: string;
  category: "core" | "clinical" | "administrative" | "support";
  level: number;
};

/** Modules resolved from global_master after Alembic; supplemental rows use fixed ids. */
export const SEED_MODULES: readonly SeedModuleDef[] = [
  {
    slug: "user-management",
    name: "User Management",
    description: "User Management — platform users, roles, and runtime capabilities.",
    category: "core",
    level: 1,
  },
  {
    slug: "configurator",
    name: "Configurator",
    description: "Tenant configuration and module enablement.",
    category: "core",
    level: 1,
  },
  {
    slug: "empi",
    name: "EMPI",
    description: "Enterprise master patient index.",
    category: "core",
    level: 1,
  },
  {
    slug: "master-data",
    name: "Master Data",
    description: "Platform catalog and reference data.",
    category: "core",
    level: 1,
  },
  {
    id: "55555555-5555-4555-8555-555555555501",
    slug: "visitpad-templates",
    name: "Visitpad Templates",
    description: "Visitpad clinical templates (units, vitals, picklists).",
    category: "clinical",
    level: 1,
  },
  {
    id: "66666666-6666-4666-8666-666666666601",
    slug: "frontdesk",
    name: "Frontdesk",
    description: "Front desk registration and OPD workflows.",
    category: "clinical",
    level: 1,
  },
  {
    id: "a1000001-0001-4001-8001-000000000001",
    slug: "opd",
    name: "opd",
    description: "Outpatient department visits and patients.",
    category: "clinical",
    level: 1,
  },
] as const;

export type SeedPermissionDef = {
  id: string;
  slug: string;
  name: string;
  action: "create" | "read" | "update" | "delete" | "manage";
  moduleSlug: string;
};

export const SEED_PERMISSIONS: readonly SeedPermissionDef[] = [
  { id: "b1000001-0001-4001-8001-000000000001", slug: "user.create", name: "Create user", action: "create", moduleSlug: "user-management" },
  { id: "b1000001-0002-4001-8001-000000000002", slug: "user.read", name: "Read user", action: "read", moduleSlug: "user-management" },
  { id: "b1000001-0003-4001-8001-000000000003", slug: "user.update", name: "Update user", action: "update", moduleSlug: "user-management" },
  { id: "b1000001-0004-4001-8001-000000000004", slug: "user.delete", name: "Delete user", action: "delete", moduleSlug: "user-management" },
  { id: "b1000002-0001-4001-8001-000000000001", slug: "role.create", name: "Create role", action: "create", moduleSlug: "user-management" },
  { id: "b1000002-0002-4001-8001-000000000002", slug: "role.read", name: "Read role", action: "read", moduleSlug: "user-management" },
  { id: "b1000002-0003-4001-8001-000000000003", slug: "role.update", name: "Update role", action: "update", moduleSlug: "user-management" },
  { id: "b1000002-0004-4001-8001-000000000004", slug: "role.delete", name: "Delete role", action: "delete", moduleSlug: "user-management" },
  { id: "b1000002-0005-4001-8001-000000000005", slug: "role.assign", name: "Assign role", action: "manage", moduleSlug: "user-management" },
  { id: "b1000003-0001-4001-8001-000000000001", slug: "capability.read", name: "Read capability catalog", action: "read", moduleSlug: "user-management" },
  { id: "c1000001-0001-4001-8001-000000000001", slug: "opd.visit.create", name: "Create OPD visit", action: "create", moduleSlug: "opd" },
  { id: "c1000001-0002-4001-8001-000000000002", slug: "opd.visit.read", name: "Read OPD visit", action: "read", moduleSlug: "opd" },
  { id: "c1000001-0003-4001-8001-000000000003", slug: "opd.patient.read", name: "Read OPD patient", action: "read", moduleSlug: "opd" },
  { id: "f1000001-0001-4001-8001-000000000001", slug: "md.shell.access", name: "Master Data shell", action: "read", moduleSlug: "master-data" },
  { id: "f1000001-0002-4001-8001-000000000002", slug: "md.visitpad.view", name: "Visitpad view", action: "read", moduleSlug: "master-data" },
  { id: "f1000001-0003-4001-8001-000000000003", slug: "md.visitpad.create", name: "Visitpad create", action: "create", moduleSlug: "master-data" },
  { id: "f1000002-0001-4001-8001-000000000001", slug: "cfg.shell.access", name: "Configurator shell", action: "read", moduleSlug: "configurator" },
  { id: "f1000003-0001-4001-8001-000000000001", slug: "fd.shell.access", name: "Frontdesk shell", action: "read", moduleSlug: "frontdesk" },
  { id: "f1000004-0001-4001-8001-000000000001", slug: "empi.patient.read", name: "Read patient", action: "read", moduleSlug: "empi" },
  { id: "f1000004-0002-4001-8001-000000000002", slug: "empi.patient.create", name: "Register patient", action: "create", moduleSlug: "empi" },
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
