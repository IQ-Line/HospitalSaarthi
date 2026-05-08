import type { EventBus } from "@hims/ts-sdk-events";
import { ValidationError } from "../domain/errors.js";
import { USER_MANAGEMENT_EVENT_USER_CREATED } from "../events/constants.js";
import { publishUserManagementEvent } from "../events/publish-user-management-event.js";
import type { CreateUserInput, User, UserRepository, UserStatus } from "../ports/index.js";

export type CreateUserDeps = {
  userRepository: UserRepository;
  eventBus: EventBus;
};

export type CreateUserContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

/**
 * Creates a tenant-scoped platform user and publishes `user-management.user.created`.
 */
export async function createUser(
  deps: CreateUserDeps,
  ctx: CreateUserContext,
  input: CreateUserInput,
): Promise<User> {
  if (typeof input.full_name !== "string") {
    throw new ValidationError("full_name_invalid_type");
  }
  if (input.full_name.trim() === "") {
    throw new ValidationError("full_name_empty");
  }
  const user = await deps.userRepository.createUser(ctx.tenantId, input);
  await publishUserManagementEvent(
    { eventBus: deps.eventBus },
    USER_MANAGEMENT_EVENT_USER_CREATED,
    ctx,
    {
      id: user.id,
      full_name: user.full_name,
      email: user.email ?? null,
      phone: user.phone ?? null,
      status: user.status as UserStatus,
      username: user.username ?? null,
      org_id: user.org_id ?? null,
      auth_user_id: user.auth_user_id ?? null,
    },
  );
  return user;
}
