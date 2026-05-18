import { InvalidCapabilityProvenanceError } from "./errors.js";
import { isValidModuleSlug, normalizeModuleSlug } from "./module-slug.js";
import type { Capability } from "./types.js";

export type CapabilityProvenanceInput = {
  source_module_slug?: string | null;
  source_permission_slug?: string | null;
  source_catalog?: string | null;
};

/**
 * Normalizes nullable provenance fields for `Capability` rows.
 * Provenance is catalog metadata only; it must not influence runtime authorization.
 */
export function normalizeCapabilityProvenance(
  input: CapabilityProvenanceInput,
): Pick<Capability, "source_module_slug" | "source_permission_slug" | "source_catalog"> {
  const rawCatalog = input.source_catalog?.trim();
  let source_catalog: "master_data" | null = null;
  if (rawCatalog !== undefined && rawCatalog.length > 0) {
    if (rawCatalog !== "master_data") {
      throw new InvalidCapabilityProvenanceError(
        "source_catalog must be master_data when set",
      );
    }
    source_catalog = "master_data";
  }

  const rawPerm = input.source_permission_slug?.trim();
  const source_permission_slug =
    rawPerm === undefined || rawPerm.length === 0 ? null : rawPerm;

  let source_module_slug: string | null = null;
  if (input.source_module_slug !== undefined && input.source_module_slug !== null) {
    const norm = normalizeModuleSlug(input.source_module_slug);
    source_module_slug = norm.length === 0 ? null : norm;
    if (source_module_slug !== null && !isValidModuleSlug(source_module_slug)) {
      throw new InvalidCapabilityProvenanceError(
        "source_module_slug must be kebab-case when set",
      );
    }
  }

  if (source_permission_slug !== null) {
    if (source_module_slug === null || !isValidModuleSlug(source_module_slug)) {
      throw new InvalidCapabilityProvenanceError(
        "source_permission_slug requires a valid source_module_slug",
      );
    }
  }

  return { source_module_slug, source_permission_slug, source_catalog };
}
