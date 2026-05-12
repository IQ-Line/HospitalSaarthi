import type { EventBus } from "@hims/ts-sdk-events";
import { demographicsSnapshotFromUpdatePayload } from "../domain/patient-payloads.js";
import { createEmpiEnvelope } from "../lib/empi-envelope.js";
import type { PatientRepo, SourceRecordRepo } from "../ports.js";
import type { Patient, UpdatePatientData } from "../domain/patient.types.js";

interface Deps {
  patientRepo: PatientRepo;
  sourceRecordRepo: SourceRecordRepo;
  eventBus: EventBus;
}

/** Thrown when PATCH changes demographics on an existing patient but omits `source_system`. */
export class SourceSystemRequiredForDemographicsUpdateError extends Error {
  readonly code = "source_system_required" as const;

  constructor() {
    super(
      "source_system is required when updating patient demographics (provenance snapshot).",
    );
    this.name = "SourceSystemRequiredForDemographicsUpdateError";
  }
}

export async function updatePatient(
  deps: Deps,
  tenantId: string,
  patientId: string,
  data: UpdatePatientData,
): Promise<Patient | undefined> {
  const demographics_snapshot = demographicsSnapshotFromUpdatePayload(data);
  const hasDemographicUpdates = Object.keys(demographics_snapshot).length > 0;

  if (hasDemographicUpdates && data.source_system == null) {
    const exists = await deps.patientRepo.findById(tenantId, patientId);
    if (exists) {
      throw new SourceSystemRequiredForDemographicsUpdateError();
    }
  }

  const patient = await deps.patientRepo.update(tenantId, patientId, data);
  if (!patient) return undefined;

  if (hasDemographicUpdates) {
    await deps.sourceRecordRepo.create({
      iq_tenant_id: patient.iq_tenant_id,
      patient_id: patient.id,
      source_system: data.source_system!,
      demographics_snapshot,
      contributed_by: data.updated_by ?? null,
    });
  }

  const changedFields = Object.keys(data).filter((k) => k !== "source_system");

  await deps.eventBus.publish(
    createEmpiEnvelope(
      "empi.patient.updated",
      patient.iq_tenant_id,
      data.updated_by,
      {
        id: patient.id,
        iq_tenant_id: patient.iq_tenant_id,
        uhid: patient.uhid,
        changed_fields: changedFields,
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
