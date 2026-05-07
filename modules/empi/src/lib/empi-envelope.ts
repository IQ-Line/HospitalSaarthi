import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";

const SCHEMA_VERSION = "1.0.0";

/** Valid UUID when no actor id is provided (e.g. system or anonymous). */
export const EMPI_SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

export function createEmpiEnvelope<T extends Record<string, unknown>>(
  eventType: string,
  iqTenantId: string,
  actorId: string | null | undefined,
  payload: T,
): DomainEvent<T> {
  return createEnvelope({
    event_type: eventType,
    source_module: "empi",
    iq_tenant_id: iqTenantId,
    correlation_id: randomUUID(),
    actor_id: actorId ?? EMPI_SYSTEM_ACTOR_ID,
    schema_version: SCHEMA_VERSION,
    payload,
  });
}
