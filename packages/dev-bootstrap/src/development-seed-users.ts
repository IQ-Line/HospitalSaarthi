/**
 * Development-only identity for platform bootstrap (`user-management` db-migrate).
 * Sign-in: better-auth → JWT → GET /auth/principal.
 */

export type DevelopmentSeedUserPersona = "platformOperator" | "pharmacist";

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

/** Configurator tenant ``demo tenant`` (slug ``dnt``). */
export const DEMO_TENANT_ID = "94478596-14d1-4e7e-b8d2-2995c61c3c90";
export const DEMO_TENANT_ORG_ID = "ea654e9f-1339-4195-b6bc-ee2f26ed07d4";

/** Platform super-admin — full catalog from Master Data sync on db-migrate. */
export const DEVELOPMENT_PLATFORM_OPERATOR: DevelopmentSeedUser = {
  persona: "platformOperator",
  userId: "f47ac10b-58cc-4372-a567-0e02b2c3d482",
  roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d483",
  roleCode: "super-admin",
  email: "platform@hospitalsaarthi.dev",
  password: "password",
  name: "Platform Operator",
  username: "platform",
  description: "Full runtime capabilities (platform super-admin).",
};

/** Pharmacy counter staff — dispense queue and walk-in billing only. */
export const DEVELOPMENT_PHARMACIST: DevelopmentSeedUser = {
  persona: "pharmacist",
  userId: "f47ac10b-58cc-4372-a567-0e02b2c3d484",
  roleId: "f47ac10b-58cc-4372-a567-0e02b2c3d485",
  roleCode: "pharmacist",
  email: "pharmacy@hospitalsaarthi.dev",
  password: "password",
  name: "Pharmacy Counter",
  username: "pharmacy",
  description: "Pharmacy counter — prescription queue and walk-in dispense.",
};

/** Dev bootstrap users (re-run `make seed` to refresh roles and capabilities). */
export const DEVELOPMENT_SEED_USERS: readonly DevelopmentSeedUser[] = [
  DEVELOPMENT_PLATFORM_OPERATOR,
  DEVELOPMENT_PHARMACIST,
] as const;

export const DEVELOPMENT_BOOTSTRAP_USER_EMAIL = DEVELOPMENT_PLATFORM_OPERATOR.email;
export const DEVELOPMENT_BOOTSTRAP_USER_PASSWORD = DEVELOPMENT_PLATFORM_OPERATOR.password;
export const DEVELOPMENT_BOOTSTRAP_USER_ID = DEVELOPMENT_PLATFORM_OPERATOR.userId;
export const DEVELOPMENT_BOOTSTRAP_ROLE_ID = DEVELOPMENT_PLATFORM_OPERATOR.roleId;
export const DEVELOPMENT_BOOTSTRAP_ROLE_CODE = DEVELOPMENT_PLATFORM_OPERATOR.roleCode;
export const DEVELOPMENT_BOOTSTRAP_USER_NAME = DEVELOPMENT_PLATFORM_OPERATOR.name;
export const DEVELOPMENT_BOOTSTRAP_USER_USERNAME = DEVELOPMENT_PLATFORM_OPERATOR.username;
