import type { IntegrationTypeCatalogEntry } from "./integration.types.js";
import { PARTNER_EXPOSED_OPERATIONS } from "./partner-exposed-operations.js";

export const INTEGRATION_TYPE_CATALOG: readonly IntegrationTypeCatalogEntry[] = [
  {
    type: "smart_report",
    display_name: "Smart Report",
    default_allowed_operations: [
      "registration.listRegistrations",
      "empi.getPatient",
    ],
    default_suggested_capability_keys: [
      "registration:registration:read",
      "empi:patient:read",
    ],
  },
] as const;

const CATALOG_BY_TYPE = new Map(
  INTEGRATION_TYPE_CATALOG.map((entry) => [entry.type, entry]),
);

export function getIntegrationTypeCatalogEntry(
  type: string,
): IntegrationTypeCatalogEntry | null {
  return CATALOG_BY_TYPE.get(type.trim()) ?? null;
}

export function listIntegrationTypeCatalog(): readonly IntegrationTypeCatalogEntry[] {
  return INTEGRATION_TYPE_CATALOG;
}

export function defaultAllowedOperationsForType(type: string): string[] {
  const entry = getIntegrationTypeCatalogEntry(type);
  if (entry === null) {
    return [...PARTNER_EXPOSED_OPERATIONS];
  }
  return [...entry.default_allowed_operations];
}

export function defaultSuggestedCapabilityKeysForType(type: string): string[] {
  const entry = getIntegrationTypeCatalogEntry(type);
  if (entry === null) {
    return [];
  }
  return [...entry.default_suggested_capability_keys];
}
