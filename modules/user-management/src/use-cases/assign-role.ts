import type { EventBus } from "@hims/ts-sdk-events";
import {
  RoleNotFoundError,
  UserNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import { USER_MANAGEMENT_EVENT_ROLE_ASSIGNED } from "../events/constants.js";
import { publishUserManagementEvent } from "../events/publish-user-management-event.js";
import type {
  AssignRoleInput,
  RoleAssignment,
  RoleAssignmentRepository,
  RoleRepository,
  UserRepository,
} from "../ports/index.js";

export type AssignRoleDeps = {
  userRepository: UserRepository;
  roleRepository: RoleRepository;
  roleAssignmentRepository: RoleAssignmentRepository;
  eventBus: EventBus;
};

export type AssignRoleContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

/**
 * Assigns a role to a user within a tenant and publishes `user-management.role.assigned`.
 */
export async function assignRole(
  deps: AssignRoleDeps,
  ctx: AssignRoleContext,
  input: AssignRoleInput,
): Promise<RoleAssignment> {
  if (
    typeof input.user_id !== "string" ||
    input.user_id.trim() === "" ||
    typeof input.role_id !== "string" ||
    input.role_id.trim() === ""
  ) {
    throw new ValidationError("assign_role_ids_invalid");
  }

  const user = await deps.userRepository.getUserById(ctx.tenantId, input.user_id);
  if (user === null) {
    throw new UserNotFoundError(input.user_id);
  }

  const role = await deps.roleRepository.getRoleById(ctx.tenantId, input.role_id);
  if (role === null) {
    throw new RoleNotFoundError(input.role_id);
  }

  const assignment = await deps.roleAssignmentRepository.assignRole(ctx.tenantId, input);
  await publishUserManagementEvent(
    { eventBus: deps.eventBus },
    USER_MANAGEMENT_EVENT_ROLE_ASSIGNED,
    ctx,
    {
      id: assignment.id,
      user_id: assignment.user_id,
      role_id: assignment.role_id,
    },
  );
  return assignment;
}
