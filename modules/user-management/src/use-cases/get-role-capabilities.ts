import { RoleNotFoundError } from "../domain/errors.js";
import type { Capability, RoleCapabilityRepository, RoleRepository } from "../ports/index.js";

export type GetRoleCapabilitiesDeps = {
  roleRepository: RoleRepository;
  roleCapabilityRepository: RoleCapabilityRepository;
};

export async function getRoleCapabilities(
  deps: GetRoleCapabilitiesDeps,
  tenantId: string,
  roleId: string,
): Promise<Capability[]> {
  const role = await deps.roleRepository.getRoleById(tenantId, roleId);
  if (role === null) {
    throw new RoleNotFoundError(roleId);
  }
  return deps.roleCapabilityRepository.listCapabilitiesByRole(tenantId, roleId);
}
