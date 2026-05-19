import type { EventBus } from "@hims/ts-sdk-events";
import type { RegistrationRecord } from "../domain/registration.types.js";
import {
  createRegistrationEnvelope,
  REGISTRATION_EVENT_REGISTRATION_CREATED,
} from "../lib/registration-helpers.js";

export type RegistrationCreatedPayload = {
  registration_id: string;
  iq_tenant_id: string;
  patient_id: string;
  patient_uhid: string;
  patient_full_name: string;
  patient_phone_number: string;
  patient_source_record_id: string;
  visit_id: string | null;
  facility_id: string | null;
  visit_type: string | null;
  department_id: string | null;
  provider_id: string | null;
  appointment_id: string | null;
  registration_status: string;
  idempotency_key: string | null;
  created_at: string;
  created_by: string | null;
};

function toCreatedPayload(record: RegistrationRecord): RegistrationCreatedPayload {
  return {
    registration_id: record.registration_id,
    iq_tenant_id: record.iq_tenant_id,
    patient_id: record.patient_id,
    patient_uhid: record.patient_uhid,
    patient_full_name: record.patient_full_name,
    patient_phone_number: record.patient_phone_number,
    patient_source_record_id: record.patient_source_record_id,
    visit_id: record.visit_id,
    facility_id: record.facility_id,
    visit_type: record.visit_type,
    department_id: record.department_id,
    provider_id: record.provider_id,
    appointment_id: record.appointment_id,
    registration_status: record.registration_status,
    idempotency_key: record.idempotency_key,
    created_at: record.created_at.toISOString(),
    created_by: record.created_by,
  };
}

export async function publishRegistrationCreated(
  deps: { eventBus: EventBus },
  record: RegistrationRecord,
  actorId: string | null | undefined,
): Promise<void> {
  await deps.eventBus.publish(
    createRegistrationEnvelope(
      REGISTRATION_EVENT_REGISTRATION_CREATED,
      record.iq_tenant_id,
      actorId ?? record.created_by,
      toCreatedPayload(record),
    ),
  );
}
