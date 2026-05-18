import { ModuleEntitlementLookupError } from "../domain/errors.js";
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

export async function listAssignableRuntimeCapabilities(
  deps: ListAssignableRuntimeCapabilitiesDeps,
  tenantId: string,
  context?: ModuleEntitlementRequestContext,
): Promise<Capability[]> {
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

  for (const moduleId of tenantEnabledModuleIds) {
    if (!moduleSlugById.has(moduleId)) {
      throw new ModuleEntitlementLookupError("master_data");
    }
  }

  const assignableModuleSlugs = new Set<string>();
  for (const platformSlug of PLATFORM_RUNTIME_MODULE_SLUGS) {
    if (isPlatformRuntimeModuleSlug(platformSlug)) {
      assignableModuleSlugs.add(normalizeModuleSlug(platformSlug));
    }
  }

  for (const slug of moduleSlugById.values()) {
    const normalized = normalizeModuleSlug(slug);
    if (!isValidModuleSlug(normalized)) {
      throw new ModuleEntitlementLookupError("master_data");
    }
    assignableModuleSlugs.add(normalized);
  }

  return deps.capabilityRepository.listActiveRuntimeCapabilitiesByModuleSlugs([
    ...assignableModuleSlugs,
  ]);
}
