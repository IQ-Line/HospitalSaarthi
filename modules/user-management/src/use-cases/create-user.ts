import type { CreateEnvelopeInput, EventBus } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";
import { USER_MANAGEMENT_EVENT_USER_CREATED } from "../events/constants.js";
import { mapAuthContextToEventEnvelope } from "../events/map-auth-context-to-envelope.js";
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
  if (typeof input.full_name !== "string" || input.full_name.trim() === "") {
    throw new Error("full_name is required");
  }
  const user = await deps.userRepository.createUser(ctx.tenantId, input);
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
    event_type: USER_MANAGEMENT_EVENT_USER_CREATED,
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
