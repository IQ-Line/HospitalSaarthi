import type { EventBus } from "@hims/ts-sdk-events";
import type { VisitRecord } from "../domain/visit.types.js";
import {
  createRegistrationEnvelope,
  REGISTRATION_SYSTEM_ACTOR_ID,
} from "../lib/registration-helpers.js";

export const VISIT_EVENT_VISIT_CREATED = "registration.visit.created" as const;

export type VisitCreatedPayload = {
  visit_id: string;
  iq_tenant_id: string;
  patient_id: string;
  visit_type: string | null;
  status: string;
  facility_id: string | null;
  department_id: string | null;
  doctor_id: string | null;
  appointment_id: string | null;
  idempotency_key: string | null;
  created_at: string;
  created_by: string | null;
};

function toCreatedPayload(record: VisitRecord): VisitCreatedPayload {
  return {
    visit_id: record.visit_id,
    iq_tenant_id: record.iq_tenant_id,
    patient_id: record.patient_id,
    visit_type: record.visit_type,
    status: record.status,
    facility_id: record.facility_id,
    department_id: record.department_id,
    doctor_id: record.doctor_id,
    appointment_id: record.appointment_id,
    idempotency_key: record.idempotency_key,
    created_at: record.created_at.toISOString(),
    created_by: record.created_by,
  };
}

export async function publishVisitCreated(
  deps: { eventBus: EventBus },
  record: VisitRecord,
  actorId: string | null | undefined,
): Promise<void> {
  await deps.eventBus.publish(
    createRegistrationEnvelope(
      VISIT_EVENT_VISIT_CREATED,
      record.iq_tenant_id,
      actorId ?? record.created_by ?? REGISTRATION_SYSTEM_ACTOR_ID,
      toCreatedPayload(record),
    ),
  );
}
