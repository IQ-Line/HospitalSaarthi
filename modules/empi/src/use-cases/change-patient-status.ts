import type { EventBus } from "@hims/ts-sdk-events";
import { createEmpiEnvelope } from "../lib/empi-envelope.js";
import { isAllowedPatientStatusTransition } from "../domain/patient-status.js";
import type { PatientRepo } from "../ports.js";
import type { Patient, PatientStatus } from "../domain/patient.types.js";

interface Deps {
  patientRepo: PatientRepo;
  eventBus: EventBus;
}

export type ChangePatientStatusResult =
  | { ok: true; patient: Patient }
  | { ok: false; error: "not_found" }
  | {
      ok: false;
      error: "invalid_status_transition";
      from: PatientStatus;
      to: PatientStatus;
    };

export async function changePatientStatus(
  deps: Deps,
  tenantId: string,
  patientId: string,
  newStatus: PatientStatus,
  updatedBy: string | null,
): Promise<ChangePatientStatusResult> {
  const existing = await deps.patientRepo.findById(tenantId, patientId);
  if (!existing) return { ok: false, error: "not_found" };

  const oldStatus = existing.status;
  if (!isAllowedPatientStatusTransition(oldStatus, newStatus)) {
    return {
      ok: false,
      error: "invalid_status_transition",
      from: oldStatus,
      to: newStatus,
    };
  }

  if (oldStatus === newStatus) {
    return { ok: true, patient: existing };
  }

  const patient = await deps.patientRepo.updateStatus(
    tenantId,
    patientId,
    newStatus,
    updatedBy,
  );
  if (!patient) return { ok: false, error: "not_found" };

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

  return { ok: true, patient };
}
