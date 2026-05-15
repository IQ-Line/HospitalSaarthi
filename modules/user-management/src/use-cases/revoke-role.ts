import type { EventBus } from "@hims/ts-sdk-events";
import {
  RoleAssignmentNotFoundError,
  RoleNotFoundError,
  UserNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import { USER_MANAGEMENT_EVENT_ROLE_REVOKED } from "../events/constants.js";
import { publishUserManagementEvent } from "../events/publish-user-management-event.js";
import type {
  AssignRoleInput,
  RoleAssignment,
  RoleAssignmentRepository,
  RoleRepository,
  UserRepository,
} from "../ports/index.js";

export type RevokeRoleDeps = {
  userRepository: UserRepository;
  roleRepository: RoleRepository;
  roleAssignmentRepository: RoleAssignmentRepository;
  eventBus: EventBus;
};

export type RevokeRoleContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

export async function revokeRole(
  deps: RevokeRoleDeps,
  ctx: RevokeRoleContext,
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

  const revoked = await deps.roleAssignmentRepository.revokeRole(ctx.tenantId, input);
  if (revoked === null) {
    throw new RoleAssignmentNotFoundError();
  }

  await publishUserManagementEvent(
    { eventBus: deps.eventBus },
    USER_MANAGEMENT_EVENT_ROLE_REVOKED,
    ctx,
    {
      id: revoked.id,
      user_id: revoked.user_id,
      role_id: revoked.role_id,
    },
  );

  return revoked;
}
