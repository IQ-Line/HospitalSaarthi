import {
  CapabilityNotFoundError,
  RoleNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import {
  RUNTIME_AUTH_LIMITS,
  assertWithinLimit,
  dedupeTrimmedIds,
} from "../domain/runtime-authorization-limits.js";
import type {
  CapabilityRepository,
  MasterDataModuleCatalogPort,
  ModuleEntitlementRequestContext,
  ReplaceRoleCapabilitiesInput,
  RoleCapabilityRepository,
  RoleRepository,
  Capability,
  TenantModuleEntitlementPort,
} from "../ports/index.js";
import { assertRuntimeCapabilitiesEntitledForTenant } from "./assert-runtime-capabilities-entitled-for-tenant.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReplaceRoleCapabilitiesDeps = {
  roleRepository: RoleRepository;
  capabilityRepository: CapabilityRepository;
  roleCapabilityRepository: RoleCapabilityRepository;
  tenantModuleEntitlementPort: TenantModuleEntitlementPort;
  masterDataModuleCatalogPort: MasterDataModuleCatalogPort;
};

export async function replaceRoleCapabilities(
  deps: ReplaceRoleCapabilitiesDeps,
  tenantId: string,
  roleId: string,
  input: ReplaceRoleCapabilitiesInput,
  context?: ModuleEntitlementRequestContext,
): Promise<Capability[]> {
  if (!Array.isArray(input.capability_ids)) {
    throw new ValidationError("replace_role_capabilities_invalid");
  }
  if (!Array.isArray(input.capability_ids)) {
    throw new ValidationError("replace_role_capabilities_invalid");
  }

  const normalized = input.capability_ids.map((capabilityId) =>
    typeof capabilityId === "string" ? capabilityId.trim() : "",
  );
  if (
    normalized.some((capabilityId) => capabilityId.length === 0 || !UUID_RE.test(capabilityId))
  ) {
    throw new ValidationError("replace_role_capabilities_invalid");
  }

  const capabilityIds = dedupeTrimmedIds(normalized);

  assertWithinLimit(
    capabilityIds.length,
    RUNTIME_AUTH_LIMITS.maxCapabilityIdsPerRequest,
    "replace_role_capabilities_limit_exceeded",
  );

  const role = await deps.roleRepository.getRoleById(tenantId, roleId);
  if (role === null) {
    throw new RoleNotFoundError(roleId);
  }

  const found = await deps.capabilityRepository.listCapabilitiesByIds(capabilityIds);
  if (found.length !== capabilityIds.length) {
    const foundIds = new Set(found.map((capability) => capability.id));
    const missing = capabilityIds.find((capabilityId) => !foundIds.has(capabilityId));
    throw new CapabilityNotFoundError(missing);
  }

  await assertRuntimeCapabilitiesEntitledForTenant(
    {
      capabilityRepository: deps.capabilityRepository,
      tenantModuleEntitlementPort: deps.tenantModuleEntitlementPort,
      masterDataModuleCatalogPort: deps.masterDataModuleCatalogPort,
    },
    tenantId,
    capabilityIds,
    { cachePolicy: "bypass-cache", authorization: context?.authorization },
  );

  return deps.roleCapabilityRepository.replaceCapabilitiesForRole(tenantId, roleId, {
    capability_ids: capabilityIds,
  });
}
