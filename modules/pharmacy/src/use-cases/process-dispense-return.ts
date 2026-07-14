import type { DispenseReturnDetail, ProcessDispenseReturnInput } from "../domain/pharmacy.types.js";
import { InventoryDispenseStockError } from "../lib/http-inventory-gateway.js";
import { computeDispenseStatusAfterReturn } from "../lib/dispense-return-status.js";
import { computeLineReturnAmount, eligibleReturnQty } from "../lib/return-amounts.js";
import type {
  DispenseReturnRepo,
  InventoryGatewayPort,
  QueueProjectionRepo,
} from "../ports.js";
import { DispenseReturnNotEligibleError } from "./get-dispense-return-eligibility.js";

const RETURN_REASONS = new Set([
  "wrong_medicine_dispensed",
  "doctor_discontinued_medication",
  "duplicate_dispensing",
  "excess_quantity_dispensed",
  "patient_refused_medicine",
  "other",
]);

export class DispenseReturnValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispenseReturnValidationError";
  }
}

export class DispenseReturnConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispenseReturnConflictError";
  }
}

export class DispenseReturnStockRestoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispenseReturnStockRestoreError";
  }
}

export type ProcessDispenseReturnCommand = ProcessDispenseReturnInput & {
  processed_by?: string | null;
  idempotency_key?: string | null;
};

export type ProcessDispenseReturnDeps = {
  dispenseReturnRepo: DispenseReturnRepo;
  queueProjectionRepo: QueueProjectionRepo;
  inventoryGateway: InventoryGatewayPort;
};

export async function processDispenseReturn(
  deps: ProcessDispenseReturnDeps,
  tenantId: string,
  command: ProcessDispenseReturnCommand,
): Promise<DispenseReturnDetail> {
  if (command.idempotency_key?.trim()) {
    const existing = await deps.dispenseReturnRepo.findByIdempotencyKey(
      tenantId,
      command.idempotency_key.trim(),
    );
    if (existing) {
      return existing;
    }
  }

  if (!RETURN_REASONS.has(command.return_reason)) {
    throw new DispenseReturnValidationError("return_reason is invalid");
  }
  if (command.return_reason === "other" && !command.remarks?.trim()) {
    throw new DispenseReturnValidationError("remarks are required when return_reason is other");
  }
  if (!command.lines?.length) {
    throw new DispenseReturnValidationError("At least one medicine line must be selected for return");
  }

  const context = await deps.dispenseReturnRepo.getEligibilityContext(tenantId, command.dispense_id);
  if (!context) {
    throw new DispenseReturnNotEligibleError();
  }

  const lineById = new Map(context.lines.map((line) => [line.id, line]));
  const selectedLineIds = new Set<string>();
  const preparedLines: Array<{
    dispense_line_item_id: string;
    return_qty: number;
    medicine_id: string | null;
    medicine_display_name: string;
    stock_batch_id: string | null;
    unit_amount: string;
    line_discount: string;
    tax_amount: string;
    return_amount: string;
  }> = [];
  const updatedLineReturns: Array<{ lineId: string; quantity_returned: string }> = [];

  for (const [index, inputLine] of command.lines.entries()) {
    const lineId = inputLine.dispense_line_item_id?.trim();
    if (!lineId) {
      throw new DispenseReturnValidationError(`lines[${index}].dispense_line_item_id is required`);
    }
    if (selectedLineIds.has(lineId)) {
      throw new DispenseReturnValidationError(`Duplicate line selection for ${lineId}`);
    }
    selectedLineIds.add(lineId);

    const sourceLine = lineById.get(lineId);
    if (!sourceLine || sourceLine.dispense_id !== command.dispense_id) {
      throw new DispenseReturnValidationError(
        `lines[${index}] is not part of the selected dispense transaction`,
      );
    }

    const returnQty = Number(inputLine.return_qty);
    if (!Number.isFinite(returnQty) || returnQty <= 0) {
      throw new DispenseReturnValidationError(`lines[${index}].return_qty must be greater than zero`);
    }

    const eligibleQty = Number(
      eligibleReturnQty(sourceLine.quantity_dispensed, sourceLine.quantity_returned),
    );
    if (returnQty > eligibleQty) {
      throw new DispenseReturnValidationError(
        `lines[${index}].return_qty exceeds eligible return quantity (${eligibleQty})`,
      );
    }

    if (
      sourceLine.stock_batch_id &&
      inputLine.stock_batch_id &&
      inputLine.stock_batch_id !== sourceLine.stock_batch_id
    ) {
      throw new DispenseReturnValidationError(`lines[${index}] batch does not match the dispense line`);
    }

    const amounts = computeLineReturnAmount(sourceLine, returnQty);
    preparedLines.push({
      dispense_line_item_id: lineId,
      return_qty: returnQty,
      medicine_id: sourceLine.medicine_id,
      medicine_display_name: sourceLine.medicine_display_name,
      stock_batch_id: sourceLine.stock_batch_id,
      unit_amount: sourceLine.unit_amount,
      line_discount: amounts.line_discount,
      tax_amount: amounts.tax_amount,
      return_amount: amounts.return_amount,
    });

    updatedLineReturns.push({
      lineId,
      quantity_returned: (Number(sourceLine.quantity_returned) + returnQty).toFixed(4),
    });
  }

  const nextLines = context.lines.map((line) => {
    const update = updatedLineReturns.find((item) => item.lineId === line.id);
    return update ? { ...line, quantity_returned: update.quantity_returned } : line;
  });
  const nextDispenseStatus = computeDispenseStatusAfterReturn(
    nextLines,
    context.record.dispense_status,
  );

  const stockRestoreLines = preparedLines
    .map((line) => {
      const sourceLine = lineById.get(line.dispense_line_item_id);
      const itemId = sourceLine?.inventory_item_id?.trim();
      if (!itemId) return null;
      const lotId = line.stock_batch_id?.trim() || null;
      return {
        item_id: itemId,
        quantity: line.return_qty,
        ...(lotId ? { lot_id: lotId } : {}),
      };
    })
    .filter(
      (line): line is { item_id: string; quantity: number; lot_id?: string } => line != null,
    );

  if (stockRestoreLines.length > 0) {
    const storeId = context.record.inventory_store_id?.trim();
    if (!storeId) {
      throw new DispenseReturnValidationError(
        "inventory_store_id is required to restore stock for returned lines",
      );
    }
    try {
      await deps.inventoryGateway.restoreDispenseStock(tenantId, {
        store_id: storeId,
        lines: stockRestoreLines,
      });
    } catch (error) {
      if (error instanceof InventoryDispenseStockError) {
        throw new DispenseReturnStockRestoreError(error.message);
      }
      throw error;
    }
  }

  const detail = await deps.dispenseReturnRepo.processReturn(
    tenantId,
    {
      ...command,
      idempotency_key: command.idempotency_key?.trim() || null,
    },
    preparedLines,
    nextDispenseStatus,
    updatedLineReturns,
  );

  await deps.queueProjectionRepo.updateDispenseStatus(
    tenantId,
    context.record.visit_id,
    nextDispenseStatus as import("../domain/pharmacy.types.js").PharmacyDispenseStatus,
  );

  return detail;
}
