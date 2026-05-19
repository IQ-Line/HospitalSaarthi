import {
  assertValidCapabilityKey,
  parseCapabilityKey,
  RUNTIME_MODULE_KEY_BY_CATALOG_SLUG,
  runtimeModuleKeyForCatalogSlug,
} from "./capability-key.js";
import { InvalidCapabilityKeyError } from "./errors.js";
import { assertValidModuleSlug, normalizeModuleSlug } from "./module-slug.js";

/**
 * Master Data permission reference (catalog only — not a runtime Cerbos key).
 * Future MD → UM sync supplies these; UM persists canonical `capability_key` rows.
 */
export type MasterDataPermissionRef = {
  /** `master_data.modules.slug` */
  moduleSlug: string;
  /**
   * `master_data.permissions.slug` — convention: `<resource>[.<subresource>…].<action>`
   * e.g. `user.create`, `registration.create`, `template.read`
   */
  permissionSlug: string;
};

export type MappedRuntimeCapability = {
  capability_key: string;
  module: string;
  feature: string;
  action: string;
  source_module_slug: string;
  source_permission_slug: string;
  source_catalog: "master_data";
};

/**
 * Maps a Master Data permission slug into the canonical UM runtime capability shape.
 * Does not persist or call Master Data — for future sync jobs and documentation only.
 */
export function mapMasterDataPermissionToRuntimeCapability(
  input: MasterDataPermissionRef,
): MappedRuntimeCapability {
  const module = assertValidModuleSlug(input.moduleSlug, "moduleSlug");
  const permissionSlug = input.permissionSlug.trim().toLowerCase();
  if (permissionSlug.length === 0) {
    throw new InvalidCapabilityKeyError("permissionSlug must be non-empty");
  }

  const segments = permissionSlug.split(/[.:]+/).filter((segment) => segment.length > 0);
  if (segments.length < 2) {
    throw new InvalidCapabilityKeyError(
      "permissionSlug must contain at least <resource>.<action> segments",
    );
  }

  const action = segments[segments.length - 1]!;
  const resource = segments.slice(0, -1).join("-");
  const moduleKey = runtimeModuleKeyForCatalogSlug(module);
  const capability_key = assertValidCapabilityKey(`${moduleKey}:${resource}:${action}`);

  return {
    capability_key,
    module,
    feature: resource,
    action,
    source_module_slug: module,
    source_permission_slug: permissionSlug,
    source_catalog: "master_data",
  };
}

/** Inverse hint for diagnostics: expected MD permission slug pattern for a runtime key. */
export function suggestMasterDataPermissionSlug(capabilityKey: string): string {
  const parsed = parseCapabilityKey(capabilityKey);
  const catalogSlug =
    Object.entries(RUNTIME_MODULE_KEY_BY_CATALOG_SLUG).find(([, key]) => key === parsed.moduleKey)?.[0] ??
    parsed.moduleKey;
  return `${normalizeModuleSlug(catalogSlug)}.${parsed.resource.replace(/-/g, ".")}.${parsed.action}`;
}
