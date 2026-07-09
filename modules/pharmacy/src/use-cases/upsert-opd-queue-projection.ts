import type {
  OpdCompletedVisitSummary,
  PharmacyDispenseStatus,
  QueueProjectionRow,
} from "../domain/pharmacy.types.js";
import { pharmacyDispenseStatusFromRecord } from "../lib/dispense-completion.js";
import {
  isEligibleOpdQueueProjectionRow,
  resolveOpdQueueQueuedAt,
} from "../lib/opd-queue-projection-eligibility.js";
import type { DispenseRecordRepo, QueueProjectionRepo, UserLookupPort } from "../ports.js";

export type QueueProjectionPatientFields = {
  patient_name: string | null;
  uhid: string | null;
  age_years: number | null;
  gender: string | null;
};

const EMPTY_PATIENT_FIELDS: QueueProjectionPatientFields = {
  patient_name: null,
  uhid: null,
  age_years: null,
  gender: null,
};

export type UpsertOpdQueueProjectionFromVisitInput = {
  visit: OpdCompletedVisitSummary;
  dispenseStatus?: PharmacyDispenseStatus;
  patientFields?: QueueProjectionPatientFields;
  doctorName?: string | null;
  phone?: string | null;
  formattedVisitId?: string | null;
};

export type OpdQueueProjectionUpsertRequest = {
  patient_id: string;
  prescription_id: string;
  doctor_id?: string | null;
  visit_status: string;
  prescription_status: string;
  medicine_count: number;
  updated_at: string;
  finalized_at?: string | null;
  patient_name?: string | null;
  uhid?: string | null;
  phone?: string | null;
  age_years?: number | null;
  gender?: string | null;
  doctor_name?: string | null;
  formatted_visit_id?: string | null;
};

async function resolveDispenseStatus(
  dispenseRecordRepo: DispenseRecordRepo,
  tenantId: string,
  visitId: string,
  override?: PharmacyDispenseStatus,
): Promise<PharmacyDispenseStatus> {
  if (override != null) {
    return override;
  }
  const record = await dispenseRecordRepo.findByVisit(tenantId, visitId);
  return pharmacyDispenseStatusFromRecord(record);
}

export async function upsertOpdQueueProjectionFromVisit(
  deps: {
    queueProjectionRepo: QueueProjectionRepo;
    dispenseRecordRepo: DispenseRecordRepo;
    userLookup: UserLookupPort;
  },
  tenantId: string,
  input: UpsertOpdQueueProjectionFromVisitInput,
): Promise<QueueProjectionRow | null> {
  const { visit } = input;
  if (!isEligibleOpdQueueProjectionRow(visit)) {
    await deps.queueProjectionRepo.deleteByVisitId(tenantId, visit.visit_id);
    return null;
  }

  const prescriptionId = visit.prescription_id;
  if (prescriptionId == null) {
    return null;
  }

  const patientFields = input.patientFields ?? EMPTY_PATIENT_FIELDS;

  const [doctorNames, dispenseStatus] = await Promise.all([
    input.doctorName !== undefined
      ? Promise.resolve(
          visit.doctor_id != null
            ? new Map<string, string>([[visit.doctor_id, input.doctorName ?? ""]])
            : new Map<string, string>(),
        )
      : visit.doctor_id != null
        ? deps.userLookup.resolveDoctorNames(tenantId, [visit.doctor_id])
        : Promise.resolve(new Map<string, string>()),
    resolveDispenseStatus(
      deps.dispenseRecordRepo,
      tenantId,
      visit.visit_id,
      input.dispenseStatus,
    ),
  ]);

  return deps.queueProjectionRepo.upsert(tenantId, {
    source_kind: "opd",
    source_ref_id: prescriptionId,
    encounter_id: visit.visit_id,
    patient_id: visit.patient_id,
    prescription_id: prescriptionId,
    doctor_id: visit.doctor_id,
    visit_status: visit.visit_status,
    prescription_status: visit.prescription_status ?? "final",
    medicine_count: visit.medicine_count,
    queued_at: resolveOpdQueueQueuedAt(visit),
    patient_name: patientFields.patient_name,
    uhid: patientFields.uhid,
    phone: input.phone ?? null,
    age_years: patientFields.age_years,
    gender: patientFields.gender,
    doctor_name:
      input.doctorName !== undefined
        ? input.doctorName
        : visit.doctor_id != null
          ? (doctorNames.get(visit.doctor_id) ?? null)
          : null,
    formatted_visit_id: input.formattedVisitId ?? null,
    dispense_status: dispenseStatus,
  });
}

export function mapOpdQueueProjectionRowToWire(row: QueueProjectionRow) {
  return {
    queue_item_id: row.queue_item_id,
    source_kind: row.source_kind,
    source_ref_id: row.source_ref_id,
    encounter_id: row.encounter_id,
    visit_id: row.encounter_id,
    patient_id: row.patient_id,
    prescription_id: row.prescription_id,
    doctor_id: row.doctor_id,
    visit_status: row.visit_status,
    prescription_status: row.prescription_status,
    medicine_count: row.medicine_count,
    queued_at: row.queued_at.toISOString(),
    patient_name: row.patient_name,
    uhid: row.uhid,
    phone: row.phone,
    age_years: row.age_years,
    gender: row.gender,
    doctor_name: row.doctor_name,
    formatted_visit_id: row.formatted_visit_id,
    dispense_status: row.dispense_status,
    last_synced_at: row.last_synced_at.toISOString(),
  };
}

export async function applyOpdQueueProjectionUpsert(
  deps: {
    queueProjectionRepo: QueueProjectionRepo;
    dispenseRecordRepo: DispenseRecordRepo;
    userLookup: UserLookupPort;
  },
  tenantId: string,
  visitId: string,
  body: OpdQueueProjectionUpsertRequest,
): Promise<QueueProjectionRow | null> {
  const patientFields: QueueProjectionPatientFields | undefined =
    body.patient_name != null ||
    body.uhid != null ||
    body.age_years != null ||
    body.gender != null
      ? {
          patient_name: body.patient_name ?? null,
          uhid: body.uhid ?? null,
          age_years: body.age_years ?? null,
          gender: body.gender ?? null,
        }
      : undefined;

  return upsertOpdQueueProjectionFromVisit(deps, tenantId, {
    visit: {
      visit_id: visitId,
      patient_id: body.patient_id,
      prescription_id: body.prescription_id,
      doctor_id: body.doctor_id ?? null,
      visit_status: body.visit_status,
      prescription_status: body.prescription_status,
      updated_at: body.updated_at,
      finalized_at: body.finalized_at ?? null,
      medicine_count: body.medicine_count,
    },
    patientFields,
    doctorName: body.doctor_name,
    phone: body.phone ?? null,
    formattedVisitId: body.formatted_visit_id ?? null,
  });
}

export async function removeOpdQueueProjection(
  deps: { queueProjectionRepo: QueueProjectionRepo },
  tenantId: string,
  visitId: string,
): Promise<void> {
  await deps.queueProjectionRepo.deleteByVisitId(tenantId, visitId);
}

export async function updateOpdQueueProjectionDispenseStatus(
  deps: { queueProjectionRepo: QueueProjectionRepo },
  tenantId: string,
  visitId: string,
  dispenseStatus: PharmacyDispenseStatus,
): Promise<void> {
  await deps.queueProjectionRepo.updateDispenseStatus(tenantId, visitId, dispenseStatus, "opd");
}
