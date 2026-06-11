import type { EventBus } from "@hims/ts-sdk-events";
import { evaluateDedupAgainstCandidate } from "../domain/registration-dedup.js";
import { normalizeIndianPhoneForEmpi } from "../lib/indian-phone.js";
import { createEmpiEnvelope } from "../lib/empi-envelope.js";
import type { PatientRepo } from "../ports.js";
import type { Patient, CreatePatientData } from "../domain/patient.types.js";
import type { RegisterPatientResult } from "./register-patient.types.js";

interface Deps {
  patientRepo: PatientRepo;
  allocatePatientUhid: (tenantId: string) => Promise<string>;
  eventBus: EventBus;
}

export type DedupDemographicsInput = Pick<
  CreatePatientData,
  | "first_name"
  | "middle_name"
  | "last_name"
  | "gender"
  | "phone_number"
  | "date_of_birth"
  | "year_of_birth"
  | "age_years"
  | "age_months"
  | "age_days"
>;

/** Same match rules as register dedup — used by find-by-demographics / visit-type resolution. */
export async function findPatientByDedupDemographics(
  deps: Pick<Deps, "patientRepo">,
  tenantId: string,
  input: DedupDemographicsInput,
): Promise<Patient | null> {
  const phone = normalizeIndianPhoneForEmpi(input.phone_number);
  if (!phone) return null;

  const fullName = [
    input.first_name?.trim(),
    input.middle_name?.trim(),
    input.last_name?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const candidates = await deps.patientRepo.findDedupCandidates(
    tenantId,
    phone,
    input.gender,
  );

  for (const candidate of candidates) {
    const dup = evaluateDedupAgainstCandidate(
      candidate,
      { ...input, iq_tenant_id: tenantId, phone_number: phone },
      fullName,
    );
    if (dup) return candidate;
  }

  return null;
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
    const phoneNumber = normalizeIndianPhoneForEmpi(data.phone_number) ?? data.phone_number;
    const candidates = await deps.patientRepo.findDedupCandidates(
      data.iq_tenant_id,
      phoneNumber,
      data.gender,
    );
    for (const candidate of candidates) {
      const dup = evaluateDedupAgainstCandidate(candidate, { ...data, phone_number: phoneNumber }, fullName);
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
