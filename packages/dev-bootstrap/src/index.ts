import {
  DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
  DEVELOPMENT_BOOTSTRAP_ROLE_ID,
  DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
  DEVELOPMENT_BOOTSTRAP_USER_ID,
  DEVELOPMENT_BOOTSTRAP_USER_NAME,
  DEVELOPMENT_BOOTSTRAP_USER_PASSWORD,
  DEVELOPMENT_BOOTSTRAP_USER_USERNAME,
  DEVELOPMENT_PLATFORM_OPERATOR,
  DEVELOPMENT_SEED_TENANT_ID,
  DEVELOPMENT_SEED_USERS,
} from "./development-seed-users.js";

/** Stable dev tenant/org ids shared across Configurator and User Management. */
export const DEVELOPMENT_BOOTSTRAP_TENANT_ID = DEVELOPMENT_SEED_TENANT_ID;
export const DEVELOPMENT_BOOTSTRAP_ORG_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d481";

export const DEVELOPMENT_BOOTSTRAP_ORG_SLUG = "hospital-saarthi-dev";
export const DEVELOPMENT_BOOTSTRAP_TENANT_SLUG = "dev-hospital";

export {
  DEVELOPMENT_BOOTSTRAP_ROLE_CODE,
  DEVELOPMENT_BOOTSTRAP_ROLE_ID,
  DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
  DEVELOPMENT_BOOTSTRAP_USER_ID,
  DEVELOPMENT_BOOTSTRAP_USER_NAME,
  DEVELOPMENT_BOOTSTRAP_USER_PASSWORD,
  DEVELOPMENT_BOOTSTRAP_USER_USERNAME,
  DEVELOPMENT_PLATFORM_OPERATOR,
  DEVELOPMENT_SEED_TENANT_ID,
  DEVELOPMENT_SEED_USERS,
};
export type { DevelopmentSeedUser, DevelopmentSeedUserPersona } from "./development-seed-users.js";
export { PLATFORM_OPERATOR_CAPABILITY_KEYS } from "./platform-operator-capability-keys.js";

export const DEVELOPMENT_BOOTSTRAP_CREDENTIALS = {
  email: DEVELOPMENT_BOOTSTRAP_USER_EMAIL,
  password: DEVELOPMENT_BOOTSTRAP_USER_PASSWORD,
} as const;

/** Off by default — use `user-management:db-migrate` (not service startup bootstrap). */
export function shouldRunPlatformDevelopmentBootstrap(): boolean {
  const explicit =
    process.env.PLATFORM_DEV_BOOTSTRAP?.trim().toLowerCase() ??
    process.env.USER_MGMT_DEV_BOOTSTRAP?.trim().toLowerCase();
  return explicit === "true";
}
