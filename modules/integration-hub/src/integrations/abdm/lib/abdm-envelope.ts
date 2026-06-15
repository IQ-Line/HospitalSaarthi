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

function createAbdmEnvelope(
  eventType: string,
  iqTenantId: string,
  payload: Record<string, unknown>,
): DomainEvent {
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
): DomainEvent {
  return createAbdmEnvelope(
    "abdm.session.state-changed",
    iqTenantId,
    payload as Record<string, unknown>,
  );
}

export interface CareContextLinkedPayload {
  sessionId: string;
  patientId?: string;
  abhaAddress?: string;
  careContextReferences: string[];
}

export function createCareContextLinkedEnvelope(
  iqTenantId: string,
  payload: CareContextLinkedPayload,
): DomainEvent {
  return createAbdmEnvelope(
    "abdm.care-context.linked",
    iqTenantId,
    payload as Record<string, unknown>,
  );
}

export interface ConsentGrantedPayload {
  consentId: string;
  patientId: string;
  dataEraseAt: string;
}

export function createConsentGrantedEnvelope(
  iqTenantId: string,
  payload: ConsentGrantedPayload,
): DomainEvent {
  return createAbdmEnvelope(
    "abdm.consent.granted",
    iqTenantId,
    payload as Record<string, unknown>,
  );
}

export interface CareContextPublishedPayload {
  sessionId: string;
  abhaAddress: string;
  careContextReferences: string[];
}

export function createCareContextPublishedEnvelope(
  iqTenantId: string,
  payload: CareContextPublishedPayload,
): DomainEvent {
  return createAbdmEnvelope(
    "abdm.care-context.published",
    iqTenantId,
    payload as Record<string, unknown>,
  );
}

export interface HealthRecordReceivedPayload {
  transferId: string;
  consentId: string;
  transactionId: string;
}

export function createHealthRecordReceivedEnvelope(
  iqTenantId: string,
  payload: HealthRecordReceivedPayload,
): DomainEvent {
  return createAbdmEnvelope(
    "abdm.health-record.received",
    iqTenantId,
    payload as Record<string, unknown>,
  );
}
