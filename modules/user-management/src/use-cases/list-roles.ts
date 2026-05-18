import type { Role, RoleRepository } from "../ports/index.js";

export type ListRolesDeps = {
  roleRepository: RoleRepository;
};

export async function listRoles(
  deps: ListRolesDeps,
  tenantId: string,
): Promise<Role[]> {
  return deps.roleRepository.listRoles(tenantId);
}
