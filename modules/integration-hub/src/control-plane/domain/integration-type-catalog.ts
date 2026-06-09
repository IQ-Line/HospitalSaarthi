import type { IntegrationTypeCatalogEntry } from "./integration.types.js";
import { PARTNER_EXPOSED_OPERATIONS } from "./partner-exposed-operations.js";

/** Single integration type — operators choose allowed operations at create time. */
export const DEFAULT_INTEGRATION_TYPE = "partner" as const;

export const INTEGRATION_TYPE_CATALOG: readonly IntegrationTypeCatalogEntry[] = [
  {
    type: DEFAULT_INTEGRATION_TYPE,
    display_name: "Partner integration",
    default_allowed_operations: [],
    default_suggested_capability_keys: [],
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
