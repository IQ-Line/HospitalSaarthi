/**
 * Development-only identities seeded by `pnpm seed:user-management-dev`.
 * All environments use the same auth path: better-auth sign-in → JWT → GET /auth/principal.
 */

export type DevelopmentSeedUserPersona =
  | "platformOperator"
  | "tenantAdmin"
  | "readonlyUser"
  | "clinicalUser";

export type DevelopmentSeedUser = {
  persona: DevelopmentSeedUserPersona;
  userId: string;
  roleId: string;
  roleCode: string;
  email: string;
  password: string;
  name: string;
  username: string;
  description: string;
};

export const DEVELOPMENT_SEED_TENANT_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d480";

/** Platform operator — full catalog + super-admin role (same as legacy bootstrap user). */
export const DEVELOPMENT_PLATFORM_OPERATOR: DevelopmentSeedUser = {
  persona: "platformOperator",
  userId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
  roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d483",
  roleCode: "super-admin",
  email: "platform@hospitalsaarthi.dev",
  password: "password",
  name: "Platform Operator",
  username: "platform",
  description: "Full runtime capabilities (platform operator / super-admin).",
};

/** Tenant administrator — user-management + shell modules. */
export const DEVELOPMENT_TENANT_ADMIN: DevelopmentSeedUser = {
  persona: "tenantAdmin",
  userId: "f47ac10b-58cc-4372-a567-0e02b2c3d490",
  roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d491",
  roleCode: "tenant-admin",
  email: "admin@hospitalsaarthi.dev",
  password: "password",
  name: "Tenant Admin",
  username: "tenant-admin",
  description: "User management and module shell access for the dev tenant.",
};

/** Read-only — list/read capabilities only. */
export const DEVELOPMENT_READONLY_USER: DevelopmentSeedUser = {
  persona: "readonlyUser",
  userId: "f47ac10b-58cc-4372-a567-0e02b2c3d492",
  roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d493",
  roleCode: "readonly",
  email: "readonly@hospitalsaarthi.dev",
  password: "password",
  name: "Readonly User",
  username: "readonly",
  description: "Read-only UM and clinical read capabilities.",
};

/** Clinical — OPD / frontdesk-style access without UM writes. */
export const DEVELOPMENT_CLINICAL_USER: DevelopmentSeedUser = {
  persona: "clinicalUser",
  userId: "f47ac10b-58cc-4372-a567-0e02b2c3d494",
  roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d495",
  roleCode: "clinical",
  email: "clinical@hospitalsaarthi.dev",
  password: "password",
  name: "Clinical User",
  username: "clinical",
  description: "Clinical module capabilities (OPD) and frontdesk shell.",
};

export const DEVELOPMENT_SEED_USERS: readonly DevelopmentSeedUser[] = [
  DEVELOPMENT_PLATFORM_OPERATOR,
  DEVELOPMENT_TENANT_ADMIN,
  DEVELOPMENT_READONLY_USER,
  DEVELOPMENT_CLINICAL_USER,
] as const;

/** @deprecated Use DEVELOPMENT_PLATFORM_OPERATOR — kept for existing seed script logs. */
export const DEVELOPMENT_BOOTSTRAP_USER_EMAIL = DEVELOPMENT_PLATFORM_OPERATOR.email;
export const DEVELOPMENT_BOOTSTRAP_USER_PASSWORD = DEVELOPMENT_PLATFORM_OPERATOR.password;
export const DEVELOPMENT_BOOTSTRAP_USER_ID = DEVELOPMENT_PLATFORM_OPERATOR.userId;
export const DEVELOPMENT_BOOTSTRAP_ROLE_ID = DEVELOPMENT_PLATFORM_OPERATOR.roleId;
export const DEVELOPMENT_BOOTSTRAP_ROLE_CODE = DEVELOPMENT_PLATFORM_OPERATOR.roleCode;
export const DEVELOPMENT_BOOTSTRAP_USER_NAME = DEVELOPMENT_PLATFORM_OPERATOR.name;
export const DEVELOPMENT_BOOTSTRAP_USER_USERNAME = DEVELOPMENT_PLATFORM_OPERATOR.username;
