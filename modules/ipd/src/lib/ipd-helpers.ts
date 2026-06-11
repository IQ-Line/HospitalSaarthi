import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";

export const IPD_EVENT_CONTRACT_VERSION = "1.0.0";
export const IPD_SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000001";

export function createIpdEnvelope<T extends Record<string, unknown>>(
  eventType: string,
  iqTenantId: string,
  actorId: string | null | undefined,
  payload: T,
): DomainEvent<T> {
  return createEnvelope({
    event_type: eventType,
    source_module: "ipd",
    iq_tenant_id: iqTenantId,
    occurred_at: new Date().toISOString(),
    correlation_id: randomUUID(),
    actor_id: actorId ?? IPD_SYSTEM_ACTOR_ID,
    event_contract_version: IPD_EVENT_CONTRACT_VERSION,
    payload,
  });
}
