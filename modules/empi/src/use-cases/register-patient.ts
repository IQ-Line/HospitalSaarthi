import type { EventBus } from "@hims/ts-sdk-events";
import { evaluateDedupAgainstCandidate } from "../domain/registration-dedup.js";
import { createEmpiEnvelope } from "../lib/empi-envelope.js";
import type { PatientRepo } from "../ports.js";
import type { Patient, CreatePatientData } from "../domain/patient.types.js";
import type { RegisterPatientResult } from "./register-patient.types.js";

interface Deps {
  patientRepo: PatientRepo;
  allocatePatientUhid: (tenantId: string) => Promise<string>;
  eventBus: EventBus;
}

export async function registerPatient(
  deps: Deps,
  data: CreatePatientData,
): Promise<RegisterPatientResult> {
  const fullName = [
    data.first_name?.trim(),
    data.middle_name?.trim(),
    data.last_name?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  if (!data.force_create) {
    const candidates = await deps.patientRepo.findDedupCandidates(
      data.iq_tenant_id,
      data.phone_number,
      data.gender,
    );
    for (const candidate of candidates) {
      const dup = evaluateDedupAgainstCandidate(candidate, data, fullName);
      if (dup) return dup;
    }
  }

  const uhid = await deps.allocatePatientUhid(data.iq_tenant_id);

  // Phase 0: sequence upsert + patient insert are separate operations; wrap in one transaction when repos expose tx handles.
  const patient = await deps.patientRepo.create({
    ...data,
    uhid,
    full_name: fullName,
  });

  await deps.eventBus.publish(
    createEmpiEnvelope(
      "empi.patient.created",
      patient.iq_tenant_id,
      data.created_by,
      {
        id: patient.id,
        iq_tenant_id: patient.iq_tenant_id,
        uhid: patient.uhid,
        full_name: patient.full_name,
        first_name: patient.first_name,
        last_name: patient.last_name,
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
