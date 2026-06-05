import { assertLoginablePlatformUser } from "../domain/assert-loginable-platform-user.js";
import type { EventBus } from "@hims/ts-sdk-events";
import {
  USER_MANAGEMENT_EVENT_USER_DEACTIVATED,
  USER_MANAGEMENT_EVENT_USER_UPDATED,
} from "../events/constants.js";
import { ensureUserEventPayload } from "../events/ensure-user-event-payload.js";
import { publishUserManagementEvent } from "../events/publish-user-management-event.js";
import type { UpdateUserInput, User, UserRepository } from "../ports/index.js";

export type UpdateUserDeps = {
  userRepository: UserRepository;
  eventBus: EventBus;
};

export type UpdateUserContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

export async function updateUser(
  deps: UpdateUserDeps,
  ctx: UpdateUserContext,
  userId: string,
  input: UpdateUserInput,
): Promise<User | null> {
  const previous = await deps.userRepository.getUserById(ctx.tenantId, userId);
  if (previous === null) {
    return null;
  }
  assertLoginablePlatformUser(previous);
  const user = await deps.userRepository.updateUser(ctx.tenantId, userId, input);
  if (!user) {
    return null;
  }

  await publishUserManagementEvent(
    { eventBus: deps.eventBus },
    USER_MANAGEMENT_EVENT_USER_UPDATED,
    ctx,
    ensureUserEventPayload(user),
  );

  if (previous !== null && previous.status !== "inactive" && user.status === "inactive") {
    await publishUserManagementEvent(
      { eventBus: deps.eventBus },
      USER_MANAGEMENT_EVENT_USER_DEACTIVATED,
      ctx,
      {
        id: user.id,
        reason: null,
      },
    );
  }

  return user;
}
