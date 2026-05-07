import type { EventBus } from "@hims/ts-sdk-events";
import { createEmpiEnvelope } from "../lib/empi-envelope.js";
import type { PatientRepo, SequenceRepo } from "../ports.js";
import type { Patient, CreatePatientData } from "../domain/patient.types.js";

interface Deps {
  patientRepo: PatientRepo;
  sequenceRepo: SequenceRepo;
  eventBus: EventBus;
  getTenantNumericCode: (tenantId: string) => string;
}

export async function registerPatient(
  deps: Deps,
  data: CreatePatientData,
): Promise<Patient> {
  const fullName = [
    data.first_name?.trim(),
    data.middle_name?.trim(),
    data.last_name?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const uhid = await generateUhid(
    deps.sequenceRepo,
    data.iq_tenant_id,
    deps.getTenantNumericCode(data.iq_tenant_id),
  );

  const patient = await deps.patientRepo.create({ ...data, uhid, full_name: fullName });

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

async function generateUhid(
  sequenceRepo: SequenceRepo,
  tenantId: string,
  tenantNumericCode: string,
): Promise<string> {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, "0");
  const dd = now.getDate().toString().padStart(2, "0");
  const dateStr = `${yy}${mm}${dd}`;

  const sequenceName = `uhid_${dateStr}`;
  const seq = await sequenceRepo.nextValue(tenantId, sequenceName);

  return `${dateStr}${tenantNumericCode}${seq.toString().padStart(7, "0")}`;
}
