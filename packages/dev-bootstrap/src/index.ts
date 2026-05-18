/** Stable dev tenant/org/user ids shared across Configurator and User Management. */
export const DEVELOPMENT_BOOTSTRAP_TENANT_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d480";
export const DEVELOPMENT_BOOTSTRAP_ORG_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d481";
export const DEVELOPMENT_BOOTSTRAP_USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d482";
export const DEVELOPMENT_BOOTSTRAP_ROLE_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d483";

export const DEVELOPMENT_BOOTSTRAP_ORG_SLUG = "hospital-saarthi-dev";
export const DEVELOPMENT_BOOTSTRAP_TENANT_SLUG = "dev-hospital";
export const DEVELOPMENT_BOOTSTRAP_USER_NAME = "Vishal";
export const DEVELOPMENT_BOOTSTRAP_USER_EMAIL = "vishal@hospitalsaarthi.dev";
export const DEVELOPMENT_BOOTSTRAP_USER_PASSWORD = "password";
export const DEVELOPMENT_BOOTSTRAP_USER_USERNAME = "vishal";
export const DEVELOPMENT_BOOTSTRAP_ROLE_CODE = "super-admin";

export const DEVELOPMENT_BOOTSTRAP_CREDENTIALS = {
  email: DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
  password: DEVELOPMENT_BOOTSTRAP_USER_PASSWORD,
} as const;

/** Master Data catalog module ids (`001_initial_schema` CORE_MODULES). */
export const DEVELOPMENT_BOOTSTRAP_MODULE_IDS = {
  userManagement: "11111111-1111-4111-8111-111111111111",
  configurator: "22222222-2222-4222-8222-222222222222",
} as const;

/** Off by default; use `pnpm seed:user-management-dev` or set `PLATFORM_DEV_BOOTSTRAP=true`. */
export function shouldRunPlatformDevelopmentBootstrap(): boolean {
  const explicit =
    process.env.PLATFORM_DEV_BOOTSTRAP?.trim().toLowerCase() ??
    process.env.USER_MGMT_DEV_BOOTSTRAP?.trim().toLowerCase();
  return explicit === "true";
}
