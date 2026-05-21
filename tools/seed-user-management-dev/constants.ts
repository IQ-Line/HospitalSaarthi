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

/** User Management L2 module slugs (parent `user-management` in Master Data). */
const UM_CATALOG_MODULE_PREFIXES = [
  "users:",
  "user-roles:",
  "user-capabilities:",
  "role-capabilities:",
] as const;

/** Filters synced active capability keys for non–platform-operator dev personas. */
export function filterCapabilityKeysForPersona(
  persona: DevelopmentSeedUserPersona,
  activeCapabilityKeys: readonly string[],
): string[] {
  const keys = [...activeCapabilityKeys];

  switch (persona) {
    case "platformOperator":
      return keys;
    case "tenantAdmin":
      return keys.filter((key) => {
        const normalized = key.trim().toLowerCase();
        if (normalized.length === 0) {
          return false;
        }
        return (
          UM_CATALOG_MODULE_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ||
          normalized.endsWith(":shell:access") ||
          normalized.startsWith("visitpad-templates:") ||
          normalized.startsWith("master-data:") ||
          normalized.startsWith("configurator:") ||
          normalized.startsWith("frontdesk:") ||
          normalized.startsWith("billing-and-finance:") ||
          normalized.startsWith("invoice:") ||
          normalized.startsWith("billing-account:") ||
          normalized.startsWith("tariff-master:") ||
          normalized.startsWith("registration:") ||
          normalized.startsWith("opd:") ||
          normalized.startsWith("empi:")
        );
      });
    case "readonlyUser":
      return keys.filter((key) => {
        const action = key.split(":").at(-1);
        return action === "read" || action === "view" || key.endsWith(":shell:access");
      });
    case "clinicalUser":
      return keys.filter(
        (key) =>
          key.startsWith("opd:") ||
          key.startsWith("empi:") ||
          key.endsWith(":shell:access"),
      );
    default:
      return keys;
  }
}
