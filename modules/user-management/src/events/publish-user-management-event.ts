import type { DomainEvent, EventBus } from "@hims/ts-sdk-events";
import {
  EnvelopeValidationError,
  createEnvelope,
  validateEnvelope,
} from "@hims/ts-sdk-events";
import { mapAuthContextToEventEnvelope } from "./map-auth-context-to-envelope.js";
import type {
  UserManagementEventPayloadMap,
} from "./contracts.js";
import { USER_MANAGEMENT_EVENT_CONTRACTS } from "./contracts.js";
import type { UserManagementEventType } from "./constants.js";

export type PublishUserManagementEventContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

export type PublishUserManagementEventDeps = {
  eventBus: EventBus;
};

export class UserManagementEventValidationError extends Error {
  constructor(
    message: string,
    readonly violations: string[],
  ) {
    super(message);
    this.name = "UserManagementEventValidationError";
  }
}

function validateEventPayload<K extends UserManagementEventType>(
  eventType: K,
  payload: unknown,
): payload is UserManagementEventPayloadMap[K] {
  const contract = USER_MANAGEMENT_EVENT_CONTRACTS[eventType];
  const result = contract.validatePayloadVerbose(payload);
  if (!result.ok) {
    throw new UserManagementEventValidationError(
      `Invalid payload for ${eventType}`,
      result.errors,
    );
  }
  return true;
}

export async function publishUserManagementEvent<K extends UserManagementEventType>(
  deps: PublishUserManagementEventDeps,
  eventType: K,
  ctx: PublishUserManagementEventContext,
  payload: UserManagementEventPayloadMap[K],
): Promise<DomainEvent<UserManagementEventPayloadMap[K]>> {
  validateEventPayload(eventType, payload);

  const envelopeIds = mapAuthContextToEventEnvelope({
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
  });
  const event = createEnvelope({
    event_type: eventType,
    source_module: "user-management",
    iq_tenant_id: envelopeIds.iq_tenant_id,
    occurred_at: new Date().toISOString(),
    correlation_id: ctx.correlationId,
    actor_id: envelopeIds.actor_id,
    event_contract_version:
      USER_MANAGEMENT_EVENT_CONTRACTS[eventType].eventContractVersion,
    payload,
  });

  try {
    validateEnvelope(event, { strict: true });
  } catch (error) {
    if (error instanceof EnvelopeValidationError) {
      throw new UserManagementEventValidationError(
        `Invalid envelope metadata for ${eventType}`,
        error.violations,
      );
    }
    throw error;
  }

  await deps.eventBus.publish(event);
  return event;
}
