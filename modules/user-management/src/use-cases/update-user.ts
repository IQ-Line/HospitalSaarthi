import type { EventBus } from "@hims/ts-sdk-events";
import {
  USER_MANAGEMENT_EVENT_USER_DEACTIVATED,
  USER_MANAGEMENT_EVENT_USER_UPDATED,
} from "../events/constants.js";
import { publishUserManagementEvent } from "../events/publish-user-management-event.js";
import type { UpdateUserInput, User, UserRepository, UserStatus } from "../ports/index.js";

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
  const user = await deps.userRepository.updateUser(ctx.tenantId, userId, input);
  if (!user) {
    return null;
  }

  await publishUserManagementEvent(
    { eventBus: deps.eventBus },
    USER_MANAGEMENT_EVENT_USER_UPDATED,
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
