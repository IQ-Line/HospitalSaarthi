import { ModuleEntitlementLookupError } from "../domain/errors.js";
import { filterRuntimeCapabilitiesByMasterDataLinks } from "../domain/master-data-source-pair.js";
import { isValidModuleSlug, normalizeModuleSlug } from "../domain/module-slug.js";
import {
  PLATFORM_RUNTIME_MODULE_SLUGS,
  isPlatformRuntimeModuleSlug,
} from "../domain/platform-module-slugs.js";
import {
  RUNTIME_AUTH_LIMITS,
  assertWithinLimit,
  dedupeTrimmedIds,
} from "../domain/runtime-authorization-limits.js";
import type {
  Capability,
  CapabilityRepository,
  MasterDataModuleCatalogPort,
  ModuleEntitlementRequestContext,
  TenantModuleEntitlementPort,
} from "../ports/index.js";

export type ListAssignableRuntimeCapabilitiesDeps = {
  capabilityRepository: CapabilityRepository;
  tenantModuleEntitlementPort: TenantModuleEntitlementPort;
  masterDataModuleCatalogPort: MasterDataModuleCatalogPort;
};

export type ListAssignableRuntimeCapabilitiesOptions = {
  /** When true, only includes capabilities from modules with `module_kind === 'product'`. */
  productOnly?: boolean;
};

export async function listAssignableRuntimeCapabilities(
  deps: ListAssignableRuntimeCapabilitiesDeps,
  tenantId: string,
  context?: ModuleEntitlementRequestContext,
  options?: ListAssignableRuntimeCapabilitiesOptions,
): Promise<Capability[]> {
  const productOnly = options?.productOnly === true;

  const tenantModuleSlugs = await resolveTenantModuleSlugs(deps, tenantId, context);

  const assignableModuleSlugs = collectAssignableModuleSlugs(tenantModuleSlugs, productOnly);

  if (productOnly) {
    await removeNonProductSlugs(deps, assignableModuleSlugs);
  }

  await addDescendantSlugs(deps, assignableModuleSlugs);

  const moduleSlugList = [...assignableModuleSlugs];
  const [runtimeCapabilities, activeMasterDataSourcePairs] = await Promise.all([
    deps.capabilityRepository.listActiveRuntimeCapabilitiesByModuleSlugs(moduleSlugList),
    deps.masterDataModuleCatalogPort.listActiveModulePermissionSourcePairs(moduleSlugList),
  ]);

  return filterRuntimeCapabilitiesByMasterDataLinks(
    runtimeCapabilities,
    assignableModuleSlugs,
    activeMasterDataSourcePairs,
  );
}

/**
 * Resolves the tenant's enabled module IDs to their Master Data slugs, enforcing the
 * resolution limit and failing closed if any enabled module ID has no known slug.
 */
async function resolveTenantModuleSlugs(
  deps: ListAssignableRuntimeCapabilitiesDeps,
  tenantId: string,
  context?: ModuleEntitlementRequestContext,
): Promise<string[]> {
  const tenantEnabledModuleIds = dedupeTrimmedIds(
    await deps.tenantModuleEntitlementPort.listTenantEnabledModuleIds(tenantId, context),
  );
  assertWithinLimit(
    tenantEnabledModuleIds.length,
    RUNTIME_AUTH_LIMITS.maxTenantModuleIdsToResolve,
    "tenant_module_ids_limit_exceeded",
  );

  const moduleSlugById = await deps.masterDataModuleCatalogPort.resolveModuleSlugsByIds(
    tenantEnabledModuleIds,
  );

  const unknownModuleIds = tenantEnabledModuleIds.filter(
    (moduleId) => !moduleSlugById.has(moduleId),
  );
  if (unknownModuleIds.length > 0) {
    throw new ModuleEntitlementLookupError("master_data", { unknownModuleIds });
  }

  return [...moduleSlugById.values()];
}

/**
 * Builds the normalized assignable-slug set: platform runtime slugs (unless productOnly)
 * plus each tenant slug, validating shape and skipping platform slugs under productOnly.
 */
function collectAssignableModuleSlugs(
  tenantModuleSlugs: string[],
  productOnly: boolean,
): Set<string> {
  const assignableModuleSlugs = new Set<string>();

  if (!productOnly) {
    for (const platformSlug of PLATFORM_RUNTIME_MODULE_SLUGS) {
      if (isPlatformRuntimeModuleSlug(platformSlug)) {
        assignableModuleSlugs.add(normalizeModuleSlug(platformSlug));
      }
    }
  }

  for (const slug of tenantModuleSlugs) {
    const normalized = normalizeModuleSlug(slug);
    if (!isValidModuleSlug(normalized)) {
      throw new ModuleEntitlementLookupError("master_data");
    }
    if (productOnly && isPlatformRuntimeModuleSlug(normalized)) {
      continue;
    }
    assignableModuleSlugs.add(normalized);
  }

  return assignableModuleSlugs;
}

/**
 * Mutates the slug set in place, dropping non-product module slugs (e.g. foundation
 * modules like EMPI). A slug with no known kind is left as-is (fail open on unknown kind).
 */
async function removeNonProductSlugs(
  deps: ListAssignableRuntimeCapabilitiesDeps,
  assignableModuleSlugs: Set<string>,
): Promise<void> {
  if (assignableModuleSlugs.size === 0) {
    return;
  }

  const kindBySlug = await deps.masterDataModuleCatalogPort.resolveModuleKindBySlugs(
    [...assignableModuleSlugs],
  );
  for (const slug of [...assignableModuleSlugs]) {
    const kind = kindBySlug.get(slug);
    if (kind !== undefined && kind !== "product") {
      assignableModuleSlugs.delete(slug);
    }
  }
}

/**
 * Mutates the slug set in place, adding catalog descendant slugs of the assignable modules.
 */
async function addDescendantSlugs(
  deps: ListAssignableRuntimeCapabilitiesDeps,
  assignableModuleSlugs: Set<string>,
): Promise<void> {
  const expandedSlugs = await deps.masterDataModuleCatalogPort.expandEnabledModuleSlugs([
    ...assignableModuleSlugs,
  ]);
  for (const slug of expandedSlugs) {
    assignableModuleSlugs.add(normalizeModuleSlug(slug));
  }
}
