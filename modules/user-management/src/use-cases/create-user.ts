import type { EventBus } from "@hims/ts-sdk-events";
import { ValidationError } from "../domain/errors.js";
import { USER_MANAGEMENT_EVENT_USER_CREATED } from "../events/constants.js";
import { ensureUserEventPayload } from "../events/ensure-user-event-payload.js";
import { publishUserManagementEvent } from "../events/publish-user-management-event.js";
import type { CreateUserInput, User, UserRepository } from "../ports/index.js";

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
    ensureUserEventPayload(user),
  );
  return user;
}
