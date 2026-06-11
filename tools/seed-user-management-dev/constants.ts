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

import type { DevelopmentSeedUserPersona } from "../../packages/dev-bootstrap/src/development-seed-users.ts";

const PHARMACIST_CAPABILITY_KEYS = [
  "pharmacy:shell:access",
  "dispense:dispense:read",
  "dispense:dispense:update",
] as const;

/** Persona-scoped capability grants for non–super-admin dev users. */
export function filterCapabilityKeysForPersona(
  persona: DevelopmentSeedUserPersona,
  activeCapabilityKeys: readonly string[],
): string[] {
  if (persona === "platformOperator") {
    return [...activeCapabilityKeys];
  }
  if (persona === "pharmacist") {
    const active = new Set(activeCapabilityKeys);
    return PHARMACIST_CAPABILITY_KEYS.filter((key) => active.has(key));
  }
  return [];
}
