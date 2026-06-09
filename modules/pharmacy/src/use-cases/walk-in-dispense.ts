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
import { computeWalkInDispenseFulfillmentStatus } from "../lib/dispense-completion.js";
import {
  filterDispenseLineRecordsForTenantCatalog,
  normalizeSaveDispenseLinesForCatalog,
} from "../lib/filter-tenant-catalog-medicines.js";
import { buildWalkInDispenseResponse } from "../lib/dispense-wire-response.js";
import type { MasterDataGatewayPort } from "../ports.js";

export class WalkInDispenseNotFoundError extends Error {
  constructor(recordId: string) {
    super(`Walk-in dispense order ${recordId} not found`);
    this.name = "WalkInDispenseNotFoundError";
  }
}

function toResponse(detail: WalkInDispenseDetail): WalkInDispenseResponse {
  return buildWalkInDispenseResponse({
    record: detail.record,
    patient: detail.patient,
    rawLines: detail.lines,
  });
}

function validatePayload(
  body: SaveWalkInDispenseInput,
  masterDataGateway: MasterDataGatewayPort,
  tenantId: string,
  bearerToken?: string,
): Promise<SaveWalkInDispenseInput> {
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

  return normalizeSaveDispenseLinesForCatalog(
    masterDataGateway,
    tenantId,
    body.lines,
    bearerToken,
    (index, detail) => {
      throw new DispenseValidationError(`lines[${index}].${detail}`);
    },
  ).then((catalogLines) => {
    const previewAmounts = computeRecordAmounts(
      catalogLines.map((line) =>
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
      lines: catalogLines,
    };
  });
}

export type SaveWalkInDispenseCommand = SaveWalkInDispenseInput & {
  createdBy?: string | null;
  bearerToken?: string;
};

export async function saveWalkInDispense(
  deps: { walkInDispenseRepo: WalkInDispenseRepo; masterDataGateway: MasterDataGatewayPort },
  tenantId: string,
  command: SaveWalkInDispenseCommand,
): Promise<WalkInDispenseResponse> {
  const payload = await validatePayload(
    command,
    deps.masterDataGateway,
    tenantId,
    command.bearerToken,
  );
  const detail = await deps.walkInDispenseRepo.create(tenantId, {
    ...payload,
    dispense_status: computeWalkInDispenseFulfillmentStatus(payload.lines),
    created_by: command.createdBy ?? null,
  });
  return toResponse(detail);
}

export type UpdateWalkInDispenseCommand = SaveWalkInDispenseInput & {
  recordId: string;
  bearerToken?: string;
};

export async function updateWalkInDispense(
  deps: { walkInDispenseRepo: WalkInDispenseRepo; masterDataGateway: MasterDataGatewayPort },
  tenantId: string,
  command: UpdateWalkInDispenseCommand,
): Promise<WalkInDispenseResponse> {
  const payload = await validatePayload(
    command,
    deps.masterDataGateway,
    tenantId,
    command.bearerToken,
  );
  const existing = await deps.walkInDispenseRepo.findByRecordId(tenantId, command.recordId);
  if (!existing) {
    throw new WalkInDispenseNotFoundError(command.recordId);
  }

  const detail = await deps.walkInDispenseRepo.upsert(tenantId, command.recordId, {
    ...payload,
    dispense_status: computeWalkInDispenseFulfillmentStatus(payload.lines),
  });
  return toResponse(detail);
}

export async function getWalkInDispense(
  deps: { walkInDispenseRepo: WalkInDispenseRepo; masterDataGateway: MasterDataGatewayPort },
  tenantId: string,
  recordId: string,
  bearerToken?: string,
): Promise<WalkInDispenseResponse> {
  const detail = await deps.walkInDispenseRepo.findByRecordId(tenantId, recordId);
  if (!detail) {
    throw new WalkInDispenseNotFoundError(recordId);
  }

  const filteredLines = await filterDispenseLineRecordsForTenantCatalog(
    deps.masterDataGateway,
    tenantId,
    detail.lines,
    bearerToken,
  );

  return buildWalkInDispenseResponse({
    record: detail.record,
    patient: detail.patient,
    rawLines: filteredLines,
  });
}
