import { RbacIntegrityViolationError } from "../domain/errors.js";
import type {
  RoleAssignmentRepository,
  RoleRepository,
  UserRepository,
} from "../ports/index.js";

export type ValidateRbacIntegrityDeps = {
  userRepository: UserRepository;
  roleRepository: RoleRepository;
  roleAssignmentRepository: RoleAssignmentRepository;
};

export async function validateRbacIntegrity(
  deps: ValidateRbacIntegrityDeps,
): Promise<void> {
  const assignments = await deps.roleAssignmentRepository.listAssignments();

  for (const assignment of assignments) {
    const user = await deps.userRepository.getUserById(
      assignment.tenant_id,
      assignment.user_id,
    );
    if (user === null) {
      throw new RbacIntegrityViolationError("orphan_role_assignment");
    }

    const role = await deps.roleRepository.getRoleById(
      assignment.tenant_id,
      assignment.role_id,
    );
    if (role === null) {
      throw new RbacIntegrityViolationError("orphan_role_assignment");
    }
  }
}
