import type {
  DispenseForVisitResponse,
  SaveDispenseForVisitInput,
} from "../domain/pharmacy.types.js";
import {
  computeLineBilling,
  computeRecordAmounts,
  multiplyDecimal,
  normalizeDiscount,
} from "../lib/dispense-amounts.js";
import {
  filterPrescriptionMedicinesForTenantCatalog,
  filterDispenseLineRecordsForTenantCatalog,
  normalizeSaveDispenseLinesForCatalog,
} from "../lib/filter-tenant-catalog-medicines.js";
import { computeOpdDispenseFulfillmentStatus } from "../lib/dispense-completion.js";
import { computeDispenseStockIssueDeltas } from "../lib/dispense-stock-delta.js";
import { InventoryDispenseStockError } from "../lib/http-inventory-gateway.js";
import { buildVisitDispenseResponse } from "../lib/dispense-wire-response.js";
import type {
  DispenseRecordRepo,
  InventoryGatewayPort,
  MasterDataGatewayPort,
  OpdGatewayPort,
  QueueProjectionRepo,
  UserLookupPort,
} from "../ports.js";
import { DispenseVisitNotFoundError } from "./get-dispense-for-visit.js";
import { updateOpdQueueProjectionDispenseStatus } from "./upsert-opd-queue-projection.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SaveDispenseForVisitCommand = SaveDispenseForVisitInput & {
  visitId: string;
  bearerToken?: string;
  createdBy?: string | null;
};

export class DispensePatientMismatchError extends Error {
  constructor() {
    super("patient_id does not match OPD prescription for this visit");
    this.name = "DispensePatientMismatchError";
  }
}

export class DispensePrescriptionMismatchError extends Error {
  constructor() {
    super("opd_prescription_id does not match the live OPD prescription for this visit");
    this.name = "DispensePrescriptionMismatchError";
  }
}

export class DispenseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispenseValidationError";
  }
}

export class DispenseAlreadyIssuedError extends Error {
  constructor() {
    super("This visit is already fully dispensed. Use Returns to reverse or adjust stock.");
    this.name = "DispenseAlreadyIssuedError";
  }
}

export class DispenseInsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispenseInsufficientStockError";
  }
}

export function assertLine(line: SaveDispenseForVisitInput["lines"][number], index: number): void {
  const medicineId = line.medicine_id?.trim();
  if (!medicineId || !UUID_RE.test(medicineId)) {
    throw new DispenseValidationError(
      `lines[${index}].medicine_id is required — choose a medicine from the tenant catalog`,
    );
  }
  if (!line.medicine_display_name?.trim()) {
    throw new DispenseValidationError(`lines[${index}].medicine_display_name is required`);
  }
  const qty = Number(line.quantity_dispensed);
  const unit = Number(line.unit_amount);
  if (!Number.isFinite(qty) || qty < 0) {
    throw new DispenseValidationError(`lines[${index}].quantity_dispensed must be a non-negative number`);
  }
  if (!Number.isFinite(unit) || unit < 0) {
    throw new DispenseValidationError(`lines[${index}].unit_amount must be a non-negative number`);
  }

  const inventoryItemId = line.inventory_item_id?.trim();
  if (inventoryItemId && !UUID_RE.test(inventoryItemId)) {
    throw new DispenseValidationError(`lines[${index}].inventory_item_id must be a valid UUID`);
  }
  if (qty > 0 && !inventoryItemId) {
    throw new DispenseValidationError(
      `lines[${index}].inventory_item_id is required when quantity_dispensed > 0`,
    );
  }

  const gross = multiplyDecimal(line.quantity_dispensed, line.unit_amount);
  if (line.line_discount != null && line.line_discount !== "") {
    const lineDiscount = Number(line.line_discount);
    if (!Number.isFinite(lineDiscount) || lineDiscount < 0) {
      throw new DispenseValidationError(`lines[${index}].line_discount must be a non-negative number`);
    }
    if (lineDiscount > Number(gross)) {
      throw new DispenseValidationError(`lines[${index}].line_discount cannot exceed line gross amount`);
    }
  }

  if (line.tax_percent != null && line.tax_percent !== "") {
    const taxPercent = Number(line.tax_percent);
    if (!Number.isFinite(taxPercent) || taxPercent < 0) {
      throw new DispenseValidationError(`lines[${index}].tax_percent must be a non-negative number`);
    }
  }
}

async function enrichPrescriptionDoctorName(
  userLookup: UserLookupPort,
  tenantId: string,
  prescription: NonNullable<DispenseForVisitResponse["opd_prescription"]>,
): Promise<NonNullable<DispenseForVisitResponse["opd_prescription"]>> {
  if (!prescription.doctor_id) {
    return prescription;
  }
  const doctorNames = await userLookup.resolveDoctorNames(tenantId, [prescription.doctor_id]);
  return {
    ...prescription,
    doctor_name: doctorNames.get(prescription.doctor_id) ?? null,
  };
}

export async function saveDispenseForVisit(
  deps: {
    opdGateway: OpdGatewayPort;
    dispenseRecordRepo: DispenseRecordRepo;
    masterDataGateway: MasterDataGatewayPort;
    inventoryGateway: InventoryGatewayPort;
    userLookup: UserLookupPort;
    queueProjectionRepo: QueueProjectionRepo;
  },
  tenantId: string,
  command: SaveDispenseForVisitCommand,
): Promise<DispenseForVisitResponse> {
  if (!command.lines?.length) {
    throw new DispenseValidationError("lines must contain at least one dispense line");
  }
  command.lines.forEach((line, index) => assertLine(line, index));

  if (command.discount != null && command.discount !== "") {
    const discount = Number(command.discount);
    if (!Number.isFinite(discount) || discount < 0) {
      throw new DispenseValidationError("discount must be a non-negative number");
    }
  }

  const inventoryStoreId = command.inventory_store_id?.trim() || null;
  if (inventoryStoreId && !UUID_RE.test(inventoryStoreId)) {
    throw new DispenseValidationError("inventory_store_id must be a valid UUID");
  }

  const prescription = await deps.opdGateway.getVisitPrescription(
    tenantId,
    command.visitId,
    command.bearerToken,
  );
  if (prescription == null) {
    throw new DispenseVisitNotFoundError(command.visitId);
  }
  if (command.patient_id !== prescription.patient_id) {
    throw new DispensePatientMismatchError();
  }

  const existingRecord = await deps.dispenseRecordRepo.findByVisit(tenantId, command.visitId);
  if (existingRecord?.dispense_status === "issued") {
    throw new DispenseAlreadyIssuedError();
  }

  if (
    command.opd_prescription_id != null &&
    command.opd_prescription_id !== prescription.prescription_id
  ) {
    throw new DispensePrescriptionMismatchError();
  }

  const opdPrescriptionId = prescription.prescription_id;

  const catalogLines = await normalizeSaveDispenseLinesForCatalog(
    deps.masterDataGateway,
    tenantId,
    command.lines,
    command.bearerToken,
    (index, detail) => {
      throw new DispenseValidationError(`lines[${index}].${detail}`);
    },
  );

  const dispensableMedicines = await filterPrescriptionMedicinesForTenantCatalog(
    deps.masterDataGateway,
    tenantId,
    prescription.medicines,
    command.bearerToken,
  );
  const dispense_status = computeOpdDispenseFulfillmentStatus(
    dispensableMedicines,
    catalogLines,
    prescription.medicines.length,
  );

  const previewAmounts = computeRecordAmounts(
    catalogLines.map((line) =>
      computeLineBilling({
        quantity_dispensed: line.quantity_dispensed,
        unit_amount: line.unit_amount,
        line_discount: line.line_discount,
        tax_percent: line.tax_percent,
      }),
    ),
    command.discount,
  );
  if (Number(previewAmounts.discount) > Number(previewAmounts.subtotal)) {
    throw new DispenseValidationError("discount cannot exceed subtotal");
  }

  const previousLines =
    existingRecord != null
      ? await deps.dispenseRecordRepo.findLinesByRecordId(tenantId, existingRecord.id)
      : [];
  const stockDeltas = computeDispenseStockIssueDeltas(previousLines, catalogLines);
  if (stockDeltas.length > 0) {
    if (!inventoryStoreId) {
      throw new DispenseValidationError(
        "inventory_store_id is required when issuing stock-backed dispense lines",
      );
    }
    try {
      await deps.inventoryGateway.issueDispenseStock(tenantId, {
        store_id: inventoryStoreId,
        lines: stockDeltas,
      });
    } catch (error) {
      if (error instanceof InventoryDispenseStockError) {
        throw new DispenseInsufficientStockError(error.message);
      }
      throw error;
    }
  }

  const { record, lines } = await deps.dispenseRecordRepo.upsertForVisit(tenantId, {
    visit_id: command.visitId,
    patient_id: command.patient_id,
    opd_prescription_id: opdPrescriptionId,
    inventory_store_id: inventoryStoreId ?? existingRecord?.inventory_store_id ?? null,
    notes: command.notes ?? null,
    discount: normalizeDiscount(command.discount),
    lines: catalogLines,
    dispense_status,
    created_by: command.createdBy ?? null,
  });

  const filteredLines = await filterDispenseLineRecordsForTenantCatalog(
    deps.masterDataGateway,
    tenantId,
    lines,
    command.bearerToken,
  );

  const enrichedPrescription = await enrichPrescriptionDoctorName(
    deps.userLookup,
    tenantId,
    prescription,
  );

  const existingProjection = await deps.queueProjectionRepo.findByVisitId(
    tenantId,
    command.visitId,
  );
  if (existingProjection != null) {
    await updateOpdQueueProjectionDispenseStatus(
      { queueProjectionRepo: deps.queueProjectionRepo },
      tenantId,
      command.visitId,
      dispense_status,
    );
  }

  const queueProjection =
    (await deps.queueProjectionRepo.findByVisitId(tenantId, command.visitId)) ??
    existingProjection;

  return buildVisitDispenseResponse({
    visitId: command.visitId,
    opdPrescription: enrichedPrescription,
    dispensableMedicines,
    record,
    rawLines: filteredLines,
    queueProjection,
  });
}
