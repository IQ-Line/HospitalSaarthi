import type {
  SaveWalkInDispenseInput,
  WalkInDispenseResponse,
} from "../domain/pharmacy.types.js";
import type { WalkInDispenseDetail, WalkInDispenseRepo } from "../ports.js";
import {
  assertWalkInPatient,
  normalizeWalkInPatientInput,
} from "../lib/walk-in-patient-validation.js";
import {
  DispenseValidationError,
  assertLine,
} from "./save-dispense-for-visit.js";
import { computeRecordAmounts, computeLineBilling } from "../lib/dispense-amounts.js";

export class WalkInDispenseNotFoundError extends Error {
  constructor(recordId: string) {
    super(`Walk-in dispense order ${recordId} not found`);
    this.name = "WalkInDispenseNotFoundError";
  }
}

function toResponse(detail: WalkInDispenseDetail): WalkInDispenseResponse {
  return {
    record_id: detail.record.id,
    walk_in_order: true,
    walk_in_patient: detail.patient,
    subtotal: detail.record.subtotal,
    discount: detail.record.discount,
    total_amount: detail.record.total_amount,
    notes: detail.record.notes,
    has_dispense: true,
    created_at: detail.record.created_at.toISOString(),
    lines: detail.lines,
  };
}

function validatePayload(body: SaveWalkInDispenseInput): SaveWalkInDispenseInput {
  if (!body.lines?.length) {
    throw new DispenseValidationError("lines must contain at least one dispense line");
  }

  const patientErrors = assertWalkInPatient(body.walk_in_patient);
  const patientErrorKeys = Object.keys(patientErrors);
  if (patientErrorKeys.length > 0) {
    throw new DispenseValidationError(patientErrors[patientErrorKeys[0] as keyof typeof patientErrors]!);
  }

  body.lines.forEach((line, index) => assertLine(line, index));

  if (body.discount != null && body.discount !== "") {
    const discount = Number(body.discount);
    if (!Number.isFinite(discount) || discount < 0) {
      throw new DispenseValidationError("discount must be a non-negative number");
    }
  }

  const previewAmounts = computeRecordAmounts(
    body.lines.map((line) =>
      computeLineBilling({
        quantity_dispensed: line.quantity_dispensed,
        unit_amount: line.unit_amount,
        line_discount: line.line_discount,
        tax_percent: line.tax_percent,
      }),
    ),
    body.discount,
  );
  if (Number(previewAmounts.discount) > Number(previewAmounts.subtotal)) {
    throw new DispenseValidationError("discount cannot exceed subtotal");
  }

  return {
    ...body,
    walk_in_patient: normalizeWalkInPatientInput(body.walk_in_patient),
  };
}

export type SaveWalkInDispenseCommand = SaveWalkInDispenseInput & {
  createdBy?: string | null;
};

export async function saveWalkInDispense(
  deps: { walkInDispenseRepo: WalkInDispenseRepo },
  tenantId: string,
  command: SaveWalkInDispenseCommand,
): Promise<WalkInDispenseResponse> {
  const payload = validatePayload(command);
  const detail = await deps.walkInDispenseRepo.create(tenantId, {
    ...payload,
    created_by: command.createdBy ?? null,
  });
  return toResponse(detail);
}

export type UpdateWalkInDispenseCommand = SaveWalkInDispenseInput & {
  recordId: string;
};

export async function updateWalkInDispense(
  deps: { walkInDispenseRepo: WalkInDispenseRepo },
  tenantId: string,
  command: UpdateWalkInDispenseCommand,
): Promise<WalkInDispenseResponse> {
  const payload = validatePayload(command);
  const existing = await deps.walkInDispenseRepo.findByRecordId(tenantId, command.recordId);
  if (!existing) {
    throw new WalkInDispenseNotFoundError(command.recordId);
  }

  const detail = await deps.walkInDispenseRepo.upsert(tenantId, command.recordId, payload);
  return toResponse(detail);
}

export async function getWalkInDispense(
  deps: { walkInDispenseRepo: WalkInDispenseRepo },
  tenantId: string,
  recordId: string,
): Promise<WalkInDispenseResponse> {
  const detail = await deps.walkInDispenseRepo.findByRecordId(tenantId, recordId);
  if (!detail) {
    throw new WalkInDispenseNotFoundError(recordId);
  }
  return toResponse(detail);
}
