import type {
  AssignRoleInput,
  EventPublisher,
  RoleAssignment,
  RoleAssignmentRepository,
} from "../ports.js";

export type AssignRoleDeps = {
  roleAssignmentRepository: RoleAssignmentRepository;
  eventPublisher: EventPublisher;
};

/**
 * Assigns a role to a user within a tenant and emits `role-assignment.changed` (or equivalent).
 */
export async function assignRole(
  deps: AssignRoleDeps,
  tenantId: string,
  input: AssignRoleInput,
): Promise<RoleAssignment> {
  if (
    typeof input.user_id !== "string" ||
    input.user_id.trim() === "" ||
    typeof input.role_id !== "string" ||
    input.role_id.trim() === ""
  ) {
    throw new Error("user_id and role_id are required");
  }
  const assignment = await deps.roleAssignmentRepository.assignRole(tenantId, input);
  await deps.eventPublisher.publishRoleAssignmentChanged(tenantId, assignment);
  return assignment;
}
