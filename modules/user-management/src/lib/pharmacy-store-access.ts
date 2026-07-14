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

function normalizeModuleSlug(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/_/g, "-");
}

export function capabilityBelongsToPharmacyModule(capability: Pick<Capability, "module" | "source_module_slug" | "capability_key">): boolean {
  const candidates = [
    capability.source_module_slug,
    capability.module,
    capability.capability_key.split(":")[0],
  ];
  return candidates.some((value) => PHARMACY_RUNTIME_MODULE_SLUGS.has(normalizeModuleSlug(value)));
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
  const pharmacySelected = selectionIncludesPharmacyModule(capabilities, selectedCapabilityIds);
  const normalized = normalizePharmacyStoreAccessInput(pharmacyStoreAccess);

  if (pharmacySelected && normalized == null) {
    throw new ValidationError("pharmacy_store_access_required");
  }

  if (!pharmacySelected && normalized != null) {
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
