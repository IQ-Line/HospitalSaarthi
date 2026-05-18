import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";
import { ABDM_ADAPTER_SOURCE_MODULE } from "./abdm-adapter-constants.js";
import type { AbdmFlowKind, AbdmSessionState } from "../domain/session.js";

const SCHEMA_VERSION = "1.0.0";

export const ABDM_SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

export interface AbdmSessionStateChangedPayload {
  sessionId: string;
  flowKind: AbdmFlowKind;
  prevState: AbdmSessionState;
  newState: AbdmSessionState;
}

export function createAbdmEnvelope<T extends Record<string, unknown>>(
  eventType: string,
  iqTenantId: string,
  payload: T,
): DomainEvent<T> {
  return createEnvelope({
    event_type: eventType,
    source_module: ABDM_ADAPTER_SOURCE_MODULE,
    iq_tenant_id: iqTenantId,
    occurred_at: new Date().toISOString(),
    correlation_id: randomUUID(),
    actor_id: ABDM_SYSTEM_ACTOR_ID,
    event_contract_version: SCHEMA_VERSION,
    payload,
  });
}

export function createSessionStateChangedEnvelope(
  iqTenantId: string,
  payload: AbdmSessionStateChangedPayload,
): DomainEvent<AbdmSessionStateChangedPayload> {
  return createAbdmEnvelope("abdm.session.state-changed", iqTenantId, payload);
}
