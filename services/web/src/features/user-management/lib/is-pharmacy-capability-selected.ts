import type { Capability } from '../types';

export const PHARMACY_MODULE_SLUG = 'pharmacy';
/** L2 dispense permissions (e.g. `dispense:dispense:read`) belong to the pharmacy product area. */
export const PHARMACY_DISPENSE_MODULE_SLUG = 'dispense';

const PHARMACY_RUNTIME_MODULE_SLUGS = new Set([
  PHARMACY_MODULE_SLUG,
  PHARMACY_DISPENSE_MODULE_SLUG,
]);

/** Operational inventory + inventory masters that require primary store assignment. */
const STORE_CONFIG_MODULE_SLUG = 'store-config';

function normalizeModuleSlug(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase().replace(/_/g, '-');
}

function capabilityModuleCandidates(capability: Capability): Array<string | null | undefined> {
  return [
    capability.source_module_slug,
    capability.module,
    capability.capability_key.split(':')[0],
  ];
}

/** L1 inventory, L2 ops (stock/indents/…), and L3 masters (inventory-master, categories, …). */
export function isInventoryStoreScopedModuleSlug(raw: string | null | undefined): boolean {
  const slug = normalizeModuleSlug(raw);
  return slug === 'inventory' || slug.startsWith('inventory-') || slug === STORE_CONFIG_MODULE_SLUG;
}

export function capabilityBelongsToPharmacyModule(capability: Capability): boolean {
  return capabilityModuleCandidates(capability).some((value) =>
    PHARMACY_RUNTIME_MODULE_SLUGS.has(normalizeModuleSlug(value)),
  );
}

export function capabilityBelongsToInventoryModule(capability: Capability): boolean {
  return capabilityModuleCandidates(capability).some((value) =>
    isInventoryStoreScopedModuleSlug(value),
  );
}

/** Capability ids that POST /users will grant from a single role template selection. */
export function resolveRoleTemplateCapabilityIdsForCreate(
  roleCapabilitySelectionIds: string[],
  assignRoles: boolean,
  roleTemplateIds: string[],
  allRoleCapabilityIds: string[],
): string[] | undefined {
  if (!assignRoles || roleTemplateIds.length !== 1) {
    return undefined;
  }
  if (allRoleCapabilityIds.length > 0) {
    const picked = roleCapabilitySelectionIds.filter((id) => allRoleCapabilityIds.includes(id));
    return picked.length > 0 ? picked : [...allRoleCapabilityIds];
  }
  return [...roleCapabilitySelectionIds];
}

function selectionMatches(
  capabilities: Capability[],
  grantIds: string[],
  predicate: (capability: Capability) => boolean,
): boolean {
  if (grantIds.length === 0) return false;
  const selected = new Set(grantIds);
  return capabilities.some((capability) => selected.has(capability.id) && predicate(capability));
}

export function willGrantPharmacyCapabilities(
  capabilities: Capability[],
  roleCapabilitySelectionIds: string[],
  assignRoles: boolean,
  roleTemplateIds: string[],
  allRoleCapabilityIds: string[],
): boolean {
  const grantIds = resolveRoleTemplateCapabilityIdsForCreate(
    roleCapabilitySelectionIds,
    assignRoles,
    roleTemplateIds,
    allRoleCapabilityIds,
  );
  if (grantIds === undefined || grantIds.length === 0) {
    return false;
  }
  return isPharmacyCapabilitySelection(capabilities, grantIds);
}

export function willGrantInventoryCapabilities(
  capabilities: Capability[],
  roleCapabilitySelectionIds: string[],
  assignRoles: boolean,
  roleTemplateIds: string[],
  allRoleCapabilityIds: string[],
): boolean {
  const grantIds = resolveRoleTemplateCapabilityIdsForCreate(
    roleCapabilitySelectionIds,
    assignRoles,
    roleTemplateIds,
    allRoleCapabilityIds,
  );
  if (grantIds === undefined || grantIds.length === 0) {
    return false;
  }
  return isInventoryCapabilitySelection(capabilities, grantIds);
}

/** Primary store assignment is required for pharmacy and/or inventory operational roles. */
export function willGrantStoreScopedCapabilities(
  capabilities: Capability[],
  roleCapabilitySelectionIds: string[],
  assignRoles: boolean,
  roleTemplateIds: string[],
  allRoleCapabilityIds: string[],
): boolean {
  return (
    willGrantPharmacyCapabilities(
      capabilities,
      roleCapabilitySelectionIds,
      assignRoles,
      roleTemplateIds,
      allRoleCapabilityIds,
    ) ||
    willGrantInventoryCapabilities(
      capabilities,
      roleCapabilitySelectionIds,
      assignRoles,
      roleTemplateIds,
      allRoleCapabilityIds,
    )
  );
}

export function isPharmacyCapabilitySelection(
  capabilities: Capability[],
  selectedCapabilityIds: string[],
): boolean {
  return selectionMatches(capabilities, selectedCapabilityIds, capabilityBelongsToPharmacyModule);
}

export function isInventoryCapabilitySelection(
  capabilities: Capability[],
  selectedCapabilityIds: string[],
): boolean {
  return selectionMatches(capabilities, selectedCapabilityIds, capabilityBelongsToInventoryModule);
}

export function validatePharmacyStoreAccess(primaryStoreId: string): string | null {
  if (!primaryStoreId.trim()) {
    return 'Select a primary store';
  }
  return null;
}
