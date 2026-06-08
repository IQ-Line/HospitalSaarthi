import type { DispenseForVisitResponse } from "../domain/pharmacy.types.js";
import type { DispenseRecordRepo, OpdGatewayPort } from "../ports.js";

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
    record_id: record?.id ?? null,
    created_at: record?.created_at.toISOString() ?? null,
    lines,
    opd_prescription: opdPrescription,
  };
}

export async function getDispenseForVisit(
  deps: { opdGateway: OpdGatewayPort; dispenseRecordRepo: DispenseRecordRepo },
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

  const record = await deps.dispenseRecordRepo.findByVisit(tenantId, input.visitId);
  const lines =
    record != null
      ? await deps.dispenseRecordRepo.findLinesByRecordId(tenantId, record.id)
      : [];

  return toResponse(input.visitId, prescription, record, lines);
}
