import type { EventBus } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";
import { randomUUID } from "node:crypto";
import type { IdentifierRepo } from "../ports.js";
import { actorIdOrRandom } from "../lib/actor-id.js";
import type {
  PatientIdentifier,
  CreateIdentifierData,
} from "../domain/patient.types.js";

interface Deps {
  identifierRepo: IdentifierRepo;
  eventBus: EventBus;
}

export async function linkIdentifier(
  deps: Deps,
  data: CreateIdentifierData,
): Promise<PatientIdentifier> {
  const identifier = await deps.identifierRepo.create(data);

  await deps.eventBus.publish(
    createEnvelope({
      event_type: "empi.patient.identifier-linked",
      source_module: "empi",
      iq_tenant_id: identifier.iq_tenant_id,
      correlation_id: randomUUID(),
      actor_id: actorIdOrRandom(data.created_by),
      schema_version: "1.0.0",
      payload: {
        id: identifier.id,
        iq_tenant_id: identifier.iq_tenant_id,
        patient_id: identifier.patient_id,
        identifier_type: identifier.identifier_type,
        identifier_value: identifier.identifier_value,
        issuing_system: identifier.issuing_system,
      },
    }),
  );

  return identifier;
}
