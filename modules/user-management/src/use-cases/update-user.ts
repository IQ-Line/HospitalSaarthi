import type { CreateEnvelopeInput, EventBus } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";
import { USER_MANAGEMENT_EVENT_USER_UPDATED } from "../events/constants.js";
import { mapAuthContextToEventEnvelope } from "../events/map-auth-context-to-envelope.js";
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
  const user = await deps.userRepository.updateUser(ctx.tenantId, userId, input);
  if (!user) {
    return null;
  }

  const envelopeIds = mapAuthContextToEventEnvelope({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
  });
  const envelopeInput: CreateEnvelopeInput<{
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    status: UserStatus;
    username: string | null;
    org_id: string | null;
    auth_user_id: string | null;
  }> = {
    event_type: USER_MANAGEMENT_EVENT_USER_UPDATED,
    source_module: "user-management",
    iq_tenant_id: envelopeIds.iq_tenant_id,
    correlation_id: ctx.correlationId,
    actor_id: envelopeIds.actor_id,
    schema_version: "1.0.0",
    payload: {
      id: user.id,
      full_name: user.full_name,
      email: user.email ?? null,
      phone: user.phone ?? null,
      status: user.status,
      username: user.username ?? null,
      org_id: user.org_id ?? null,
      auth_user_id: user.auth_user_id ?? null,
    },
  };
  await deps.eventBus.publish(createEnvelope(envelopeInput));

  return user;
}
