import type { DispenseForVisitResponse } from "../domain/pharmacy.types.js";
import type { DispenseRecordRepo, MasterDataGatewayPort, OpdGatewayPort, UserLookupPort } from "../ports.js";
import {
  filterDispenseLineRecordsForTenantCatalog,
  filterPrescriptionMedicinesForTenantCatalog,
} from "../lib/filter-tenant-catalog-medicines.js";
import { pharmacyDispenseStatusFromRecord } from "../lib/dispense-completion.js";

export type GetDispenseForVisitInput = {
  visitId: string;
  bearerToken?: string;
};

export class DispenseVisitNotFoundError extends Error {
  constructor(visitId: string) {
    super(`No OPD prescription found for visit ${visitId}`);
    this.name = "DispenseVisitNotFoundError";
  }
}

function toResponse(
  visitId: string,
  opdPrescription: NonNullable<DispenseForVisitResponse["opd_prescription"]>,
  dispensableMedicines: DispenseForVisitResponse["dispensable_medicines"],
  record: Awaited<ReturnType<DispenseRecordRepo["findByVisit"]>>,
  lines: DispenseForVisitResponse["lines"],
): DispenseForVisitResponse {
  return {
    visit_id: visitId,
    patient_id: record?.patient_id ?? opdPrescription.patient_id,
    opd_prescription_id: record?.opd_prescription_id ?? opdPrescription.prescription_id,
    subtotal: record?.subtotal ?? "0.0000",
    discount: record?.discount ?? "0.0000",
    total_amount: record?.total_amount ?? "0.0000",
    notes: record?.notes ?? null,
    has_dispense: record != null,
    dispense_status: pharmacyDispenseStatusFromRecord(record),
    record_id: record?.id ?? null,
    created_at: record?.created_at.toISOString() ?? null,
    lines,
    opd_prescription: opdPrescription,
    dispensable_medicines: dispensableMedicines,
  };
}

export async function getDispenseForVisit(
  deps: {
    opdGateway: OpdGatewayPort;
    dispenseRecordRepo: DispenseRecordRepo;
    masterDataGateway: MasterDataGatewayPort;
    userLookup: UserLookupPort;
  },
  tenantId: string,
  input: GetDispenseForVisitInput,
): Promise<DispenseForVisitResponse> {
  const prescription = await deps.opdGateway.getVisitPrescription(
    tenantId,
    input.visitId,
    input.bearerToken,
  );
  if (prescription == null) {
    throw new DispenseVisitNotFoundError(input.visitId);
  }

  let enrichedPrescription = prescription;
  if (prescription.doctor_id) {
    const doctorNames = await deps.userLookup.resolveDoctorNames(tenantId, [prescription.doctor_id]);
    enrichedPrescription = {
      ...prescription,
      doctor_name: doctorNames.get(prescription.doctor_id) ?? null,
    };
  }

  const dispensableMedicines = await filterPrescriptionMedicinesForTenantCatalog(
    deps.masterDataGateway,
    tenantId,
    enrichedPrescription.medicines,
    input.bearerToken,
  );

  const record = await deps.dispenseRecordRepo.findByVisit(tenantId, input.visitId);
  const rawLines =
    record != null
      ? await deps.dispenseRecordRepo.findLinesByRecordId(tenantId, record.id)
      : [];
  const lines = await filterDispenseLineRecordsForTenantCatalog(
    deps.masterDataGateway,
    tenantId,
    rawLines,
    input.bearerToken,
  );

  return toResponse(input.visitId, enrichedPrescription, dispensableMedicines, record, lines);
}
