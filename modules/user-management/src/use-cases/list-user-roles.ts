import { UserNotFoundError } from "../domain/errors.js";
import type { Role, RoleAssignmentRepository, RoleRepository, UserRepository } from "../ports/index.js";

export type ListUserRolesDeps = {
  roleAssignmentRepository: RoleAssignmentRepository;
  roleRepository: RoleRepository;
  userRepository: UserRepository;
};

export async function listUserRoles(
  deps: ListUserRolesDeps,
  tenantId: string,
  userId: string,
): Promise<Role[]> {
  const user = await deps.userRepository.getUserById(tenantId, userId);
  if (user === null) {
    throw new UserNotFoundError(userId);
  }

  const assignments = await deps.roleAssignmentRepository.listAssignmentsByUser(tenantId, userId);
  if (assignments.length === 0) {
    return [];
  }

  return deps.roleRepository.listRolesByIds(
    tenantId,
    assignments.map((assignment) => assignment.role_id),
  );
}
