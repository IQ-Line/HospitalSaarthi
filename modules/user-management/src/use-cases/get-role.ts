import type { Role, RoleRepository } from "../ports/index.js";

export type GetRoleDeps = {
  roleRepository: RoleRepository;
};

export async function getRoleById(
  deps: GetRoleDeps,
  tenantId: string,
  roleId: string,
): Promise<Role | null> {
  return deps.roleRepository.getRoleById(tenantId, roleId);
}
