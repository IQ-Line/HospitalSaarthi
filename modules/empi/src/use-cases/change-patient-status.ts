import type { EventBus } from "@hims/ts-sdk-events";
import { createEmpiEnvelope } from "../lib/empi-envelope.js";
import type { PatientRepo } from "../ports.js";
import type { Patient, PatientStatus } from "../domain/patient.types.js";

interface Deps {
  patientRepo: PatientRepo;
  eventBus: EventBus;
}

export async function changePatientStatus(
  deps: Deps,
  tenantId: string,
  patientId: string,
  newStatus: PatientStatus,
  updatedBy: string | null,
): Promise<Patient | undefined> {
  const existing = await deps.patientRepo.findById(tenantId, patientId);
  if (!existing) return undefined;

  const oldStatus = existing.status;
  const patient = await deps.patientRepo.updateStatus(
    tenantId,
    patientId,
    newStatus,
    updatedBy,
  );
  if (!patient) return undefined;

  await deps.eventBus.publish(
    createEmpiEnvelope(
      "empi.patient.status-changed",
      patient.iq_tenant_id,
      updatedBy,
      {
        id: patient.id,
        iq_tenant_id: patient.iq_tenant_id,
        uhid: patient.uhid,
        old_status: oldStatus,
        new_status: newStatus,
      },
    ),
  );

  return patient;
}
