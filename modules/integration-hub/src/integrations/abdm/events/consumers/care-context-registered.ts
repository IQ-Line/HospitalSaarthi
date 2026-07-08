import type { DomainEvent } from "@hims/ts-sdk-events";
import type { AbdmAdapterDeps } from "../../ports.js";
import { orchestrateM2AfterCareContexts } from "../../use-cases/m2/orchestrate-m2-after-care-contexts.js";

/** Payload per record-foundation schema-reference (`care-context.registered`). */
export type CareContextRegisteredPayload = {
  care_context_id: string;
  patient_id: string;
  source_record_type?: string;
  display?: string;
  iq_tenant_id?: string;
};

const EVENT_TYPES = [
  "record-foundation.care-context.registered",
  "record-foundation.care-context.created",
] as const;

export function isCareContextRegisteredEvent(
  event: DomainEvent,
): event is DomainEvent<CareContextRegisteredPayload> {
  return (EVENT_TYPES as readonly string[]).includes(event.event_type);
}

export async function handleCareContextRegisteredEvent(
  event: DomainEvent<CareContextRegisteredPayload>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const iqTenantId = event.iq_tenant_id;
  const patientId = event.payload.patient_id;
  const careContextId = event.payload.care_context_id;
  const hiType = event.payload.source_record_type ?? "OPCONSULTATION";
  const display =
    event.payload.display?.trim() || `Care context ${careContextId}`;

  await orchestrateM2AfterCareContexts(
    {
      iqTenantId,
      patientId,
      careContexts: [
        {
          referenceNumber: careContextId,
          display,
          hiType,
        },
      ],
    },
    deps,
  );
}
