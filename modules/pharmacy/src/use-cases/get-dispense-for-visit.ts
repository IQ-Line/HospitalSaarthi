import type { DispenseForVisitResponse } from "../domain/pharmacy.types.js";
import type {
  DispenseRecordRepo,
  MasterDataGatewayPort,
  OpdGatewayPort,
  OpdQueueProjectionRepo,
  QueueProjectionRepo,
  UserLookupPort,
} from "../ports.js";
import {
  filterDispenseLineRecordsForTenantCatalog,
  filterPrescriptionMedicinesForTenantCatalog,
} from "../lib/filter-tenant-catalog-medicines.js";
import { buildVisitDispenseResponse } from "../lib/dispense-wire-response.js";

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

export async function getDispenseForVisit(
  deps: {
    opdGateway: OpdGatewayPort;
    dispenseRecordRepo: DispenseRecordRepo;
    masterDataGateway: MasterDataGatewayPort;
    userLookup: UserLookupPort;
    queueProjectionRepo: QueueProjectionRepo;
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

  const [dispensableMedicines, record, queueProjection] = await Promise.all([
    filterPrescriptionMedicinesForTenantCatalog(
      deps.masterDataGateway,
      tenantId,
      enrichedPrescription.medicines,
      input.bearerToken,
    ),
    deps.dispenseRecordRepo.findByVisit(tenantId, input.visitId),
    deps.queueProjectionRepo.findByVisitId(tenantId, input.visitId),
  ]);

  const rawLines =
    record != null
      ? await deps.dispenseRecordRepo.findLinesByRecordId(tenantId, record.id)
      : [];
  const filteredLines = await filterDispenseLineRecordsForTenantCatalog(
    deps.masterDataGateway,
    tenantId,
    rawLines,
    input.bearerToken,
  );

  return buildVisitDispenseResponse({
    visitId: input.visitId,
    opdPrescription: enrichedPrescription,
    dispensableMedicines,
    record,
    rawLines: filteredLines,
    queueProjection,
  });
}
