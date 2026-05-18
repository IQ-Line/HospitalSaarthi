import type { RoleAssignmentRef, RoleAssignmentRepository } from "../ports/index.js";

export type ListRoleAssignmentsDeps = {
  roleAssignmentRepository: RoleAssignmentRepository;
};

export async function listRoleAssignments(
  deps: ListRoleAssignmentsDeps,
  tenantId: string,
  filter?: Readonly<{ userId?: string; roleId?: string }>,
): Promise<RoleAssignmentRef[]> {
  return deps.roleAssignmentRepository.listAssignmentsByTenant(tenantId, filter);
}
