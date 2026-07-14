import type { Capability } from "../domain/types.js";
import type {
  PharmacyStoreAccessInput,
  PharmacyStoreAccessSnapshot,
} from "../domain/pharmacy-store-access.types.js";
import { ValidationError } from "../domain/errors.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PHARMACY_MODULE_SLUG = "pharmacy";
/** L2 dispense permissions (e.g. `dispense:dispense:read`) belong to the pharmacy product area. */
export const PHARMACY_DISPENSE_MODULE_SLUG = "dispense";

const PHARMACY_RUNTIME_MODULE_SLUGS = new Set([
  PHARMACY_MODULE_SLUG,
  PHARMACY_DISPENSE_MODULE_SLUG,
]);

/** Store-config is the operational store master used by inventory workflows. */
const STORE_CONFIG_MODULE_SLUG = "store-config";

function normalizeModuleSlug(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/_/g, "-");
}

function capabilityModuleCandidates(
  capability: Pick<Capability, "module" | "source_module_slug" | "capability_key">,
): Array<string | null | undefined> {
  return [
    capability.source_module_slug,
    capability.module,
    capability.capability_key.split(":")[0],
  ];
}

/** L1 inventory, L2 ops (stock/indents/…), and L3 masters (inventory-master, categories, …). */
export function isInventoryStoreScopedModuleSlug(raw: string | null | undefined): boolean {
  const slug = normalizeModuleSlug(raw);
  return slug === "inventory" || slug.startsWith("inventory-") || slug === STORE_CONFIG_MODULE_SLUG;
}

export function capabilityBelongsToPharmacyModule(capability: Pick<Capability, "module" | "source_module_slug" | "capability_key">): boolean {
  return capabilityModuleCandidates(capability).some((value) =>
    PHARMACY_RUNTIME_MODULE_SLUGS.has(normalizeModuleSlug(value)),
  );
}

export function capabilityBelongsToInventoryModule(capability: Pick<Capability, "module" | "source_module_slug" | "capability_key">): boolean {
  return capabilityModuleCandidates(capability).some((value) =>
    isInventoryStoreScopedModuleSlug(value),
  );
}

export function selectionIncludesPharmacyModule(
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

export function selectionIncludesInventoryModule(
  capabilities: Capability[],
  selectedCapabilityIds: string[],
): boolean {
  if (selectedCapabilityIds.length === 0) {
    return false;
  }
  const selected = new Set(selectedCapabilityIds);
  return capabilities.some(
    (capability) => selected.has(capability.id) && capabilityBelongsToInventoryModule(capability),
  );
}

export function selectionIncludesStoreScopedModule(
  capabilities: Capability[],
  selectedCapabilityIds: string[],
): boolean {
  return (
    selectionIncludesPharmacyModule(capabilities, selectedCapabilityIds) ||
    selectionIncludesInventoryModule(capabilities, selectedCapabilityIds)
  );
}

export function normalizePharmacyStoreAccessInput(
  input: PharmacyStoreAccessInput | null | undefined,
): PharmacyStoreAccessSnapshot | null {
  if (input == null) {
    return null;
  }

  const primary = input.primary_store_id?.trim() ?? "";
  if (!UUID_RE.test(primary)) {
    throw new ValidationError("pharmacy_store_access_primary_invalid");
  }

  const secondaryRaw = input.secondary_store_ids ?? [];
  if (!Array.isArray(secondaryRaw)) {
    throw new ValidationError("pharmacy_store_access_secondary_invalid");
  }

  const secondary: string[] = [];
  for (const storeId of secondaryRaw) {
    const normalized = typeof storeId === "string" ? storeId.trim() : "";
    if (!UUID_RE.test(normalized)) {
      throw new ValidationError("pharmacy_store_access_secondary_invalid");
    }
    if (normalized === primary) {
      throw new ValidationError("pharmacy_store_access_primary_secondary_overlap");
    }
    if (!secondary.includes(normalized)) {
      secondary.push(normalized);
    }
  }

  return {
    primary_store_id: primary,
    secondary_store_ids: secondary,
  };
}

export function assertPharmacyStoreAccessMatchesCapabilities(
  capabilities: Capability[],
  selectedCapabilityIds: string[],
  pharmacyStoreAccess: PharmacyStoreAccessInput | null | undefined,
): PharmacyStoreAccessSnapshot | null {
  const storeScoped = selectionIncludesStoreScopedModule(capabilities, selectedCapabilityIds);
  const normalized = normalizePharmacyStoreAccessInput(pharmacyStoreAccess);

  if (storeScoped && normalized == null) {
    throw new ValidationError("pharmacy_store_access_required");
  }

  if (!storeScoped && normalized != null) {
    throw new ValidationError("pharmacy_store_access_not_allowed");
  }

  return normalized;
}

export function pharmacyStoreAccessToAssignmentRows(
  access: PharmacyStoreAccessSnapshot,
): { store_id: string; assignment_kind: "primary" | "secondary" }[] {
  return [
    { store_id: access.primary_store_id!, assignment_kind: "primary" },
    ...access.secondary_store_ids.map((store_id) => ({
      store_id,
      assignment_kind: "secondary" as const,
    })),
  ];
}
