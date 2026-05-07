import type { EventBus } from "@hims/ts-sdk-events";
import { createEmpiEnvelope } from "../lib/empi-envelope.js";
import type { PatientRepo } from "../ports.js";
import type { Patient, UpdatePatientData } from "../domain/patient.types.js";

interface Deps {
  patientRepo: PatientRepo;
  eventBus: EventBus;
}

export async function updatePatient(
  deps: Deps,
  tenantId: string,
  patientId: string,
  data: UpdatePatientData,
): Promise<Patient | undefined> {
  const patient = await deps.patientRepo.update(tenantId, patientId, data);
  if (!patient) return undefined;

  await deps.eventBus.publish(
    createEmpiEnvelope(
      "empi.patient.updated",
      patient.iq_tenant_id,
      data.updated_by,
      {
        id: patient.id,
        iq_tenant_id: patient.iq_tenant_id,
        uhid: patient.uhid,
        changed_fields: Object.keys(data),
        full_name: patient.full_name,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        phone_number: patient.phone_number,
        abha_number: patient.abha_number,
        status: patient.status,
      },
    ),
  );

  return patient;
}
