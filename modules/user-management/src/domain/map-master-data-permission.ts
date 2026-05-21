import {
  assertValidCapabilityKey,
  parseCapabilityKey,
  RUNTIME_CAPABILITY_ACTIONS,
  type RuntimeCapabilityAction,
} from "./capability-key.js";
import { InvalidCapabilityKeyError } from "./errors.js";
import { assertValidModuleSlug, normalizeModuleSlug } from "./module-slug.js";
import { resolveMasterDataPermissionSlugForMapping } from "./resolve-master-data-permission-slug.js";

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
  /** `master_data.permissions.action` when it differs from the last slug segment (e.g. write → update). */
  catalogAction?: string;
  /** Human label from `master_data.permissions.name`. */
  displayName?: string;
};

export type MappedRuntimeCapability = {
  capability_key: string;
  module: string;
  feature: string;
  action: string;
  display_name: string;
  source_module_slug: string;
  source_permission_slug: string;
  source_catalog: "master_data";
};

const RUNTIME_ACTION_SET = new Set<string>(RUNTIME_CAPABILITY_ACTIONS);

/** Master Data catalog actions that differ from runtime capability key actions. */
const CATALOG_ACTION_ALIASES: Readonly<Record<string, RuntimeCapabilityAction>> = {
  edit: "update",
  write: "update",
};

function normalizeCatalogAction(raw: string): RuntimeCapabilityAction {
  const action = raw.trim().toLowerCase();
  const resolved = CATALOG_ACTION_ALIASES[action] ?? action;
  if (!RUNTIME_ACTION_SET.has(resolved)) {
    throw new InvalidCapabilityKeyError(
      `catalog action "${raw}" is not a recognized runtime capability action`,
    );
  }
  return resolved as RuntimeCapabilityAction;
}

/**
 * Maps a Master Data `module_permissions` row into the canonical UM runtime capability shape.
 */
export function mapMasterDataPermissionToRuntimeCapability(
  input: MasterDataPermissionRef,
): MappedRuntimeCapability {
  const module = assertValidModuleSlug(input.moduleSlug, "moduleSlug");
  const permissionSlug = resolveMasterDataPermissionSlugForMapping(
    module,
    input.permissionSlug,
  );

  let segments = permissionSlug.split(/[.:]+/).filter((segment) => segment.length > 0);
  if (segments.length < 2) {
    throw new InvalidCapabilityKeyError(
      "permissionSlug must contain at least <resource>.<action> segments",
    );
  }

  if (segments.length >= 3 && segments[0] === module) {
    segments = segments.slice(1);
  }

  const slugAction = segments[segments.length - 1]!;
  const action = RUNTIME_ACTION_SET.has(slugAction)
    ? normalizeCatalogAction(slugAction)
    : normalizeCatalogAction(
        input.catalogAction !== undefined && input.catalogAction.trim().length > 0
          ? input.catalogAction
          : slugAction,
      );

  const resourceSegments = segments.slice(0, -1);
  const feature =
    resourceSegments.length === 1 && resourceSegments[0] === module
      ? module
      : resourceSegments.join("-");

  const capability_key = assertValidCapabilityKey(`${module}:${feature}:${action}`);

  const displayName =
    input.displayName?.trim() ||
    `${feature.replace(/-/g, " ")} ${action}`.replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    capability_key,
    module,
    feature,
    action,
    source_module_slug: module,
    source_permission_slug: input.permissionSlug.trim().toLowerCase(),
    source_catalog: "master_data",
    display_name: displayName,
  };
}

/** Inverse hint for diagnostics: expected MD permission slug pattern for a runtime key. */
export function suggestMasterDataPermissionSlug(capabilityKey: string): string {
  const parsed = parseCapabilityKey(capabilityKey);
  if (parsed.resource === parsed.moduleKey) {
    return `${normalizeModuleSlug(parsed.moduleKey)}.${parsed.action}`;
  }
  const resource = parsed.resource.replace(/-/g, ".");
  return `${normalizeModuleSlug(parsed.moduleKey)}.${resource}.${parsed.action}`;
}
