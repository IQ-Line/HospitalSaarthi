import type { Capability } from '../types';

export const PHARMACY_MODULE_SLUG = 'pharmacy';
/** L2 dispense permissions (e.g. `dispense:dispense:read`) belong to the pharmacy product area. */
export const PHARMACY_DISPENSE_MODULE_SLUG = 'dispense';

const PHARMACY_RUNTIME_MODULE_SLUGS = new Set([
  PHARMACY_MODULE_SLUG,
  PHARMACY_DISPENSE_MODULE_SLUG,
]);

function normalizeModuleSlug(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase().replace(/_/g, '-');
}

export function capabilityBelongsToPharmacyModule(capability: Capability): boolean {
  const candidates = [
    capability.source_module_slug,
    capability.module,
    capability.capability_key.split(':')[0],
  ];
  return candidates.some((value) => PHARMACY_RUNTIME_MODULE_SLUGS.has(normalizeModuleSlug(value)));
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

export function isPharmacyCapabilitySelection(
  capabilities: Capability[],
  selectedCapabilityIds: string[],
): boolean {
  if (selectedCapabilityIds.length === 0) {
    return false;
  }
  const selected = new Set(selectedCapabilityIds);
  return capabilities.some(
    (capability) => selected.has(capability.id) && capabilityBelongsToPharmacyModule(capability),
  );
}

export function validatePharmacyStoreAccess(primaryStoreId: string): string | null {
  if (!primaryStoreId.trim()) {
    return 'Select a primary store for pharmacy access';
  }
  return null;
}
