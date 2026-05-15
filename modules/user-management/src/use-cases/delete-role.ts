import type { Role, RoleRepository } from "../ports/index.js";

export type DeleteRoleDeps = {
  roleRepository: RoleRepository;
};

export async function deleteRole(
  deps: DeleteRoleDeps,
  tenantId: string,
  roleId: string,
): Promise<Role | null> {
  return deps.roleRepository.deleteRole(tenantId, roleId);
}
