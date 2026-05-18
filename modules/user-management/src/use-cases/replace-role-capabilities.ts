import {
  CapabilityNotFoundError,
  RoleNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import type {
  CapabilityRepository,
  ReplaceRoleCapabilitiesInput,
  RoleCapabilityRepository,
  RoleRepository,
  Capability,
} from "../ports/index.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReplaceRoleCapabilitiesDeps = {
  roleRepository: RoleRepository;
  capabilityRepository: CapabilityRepository;
  roleCapabilityRepository: RoleCapabilityRepository;
};

export async function replaceRoleCapabilities(
  deps: ReplaceRoleCapabilitiesDeps,
  tenantId: string,
  roleId: string,
  input: ReplaceRoleCapabilitiesInput,
): Promise<Capability[]> {
  if (!Array.isArray(input.capability_ids)) {
    throw new ValidationError("replace_role_capabilities_invalid");
  }
  const capabilityIds = input.capability_ids
    .filter((capabilityId): capabilityId is string => typeof capabilityId === "string")
    .map((capabilityId) => capabilityId.trim())
    .filter((capabilityId) => capabilityId.length > 0 && UUID_RE.test(capabilityId));

  if (capabilityIds.length !== input.capability_ids.length) {
    throw new ValidationError("replace_role_capabilities_invalid");
  }

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

  return deps.roleCapabilityRepository.replaceCapabilitiesForRole(tenantId, roleId, {
    capability_ids: capabilityIds,
  });
}
