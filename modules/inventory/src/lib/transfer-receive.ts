import type { ReceiveStockTransferLineInput } from "../domain/transfer.types.js";
import { TransferValidationError } from "../errors.js";
import {
  creditAcceptedFromAllocations,
  returnRejectedFromAllocations,
  type StockAllocation,
} from "./credit-stock.js";
import type { StockTx } from "./deduct-stock-fefo.js";
import { qtyGreaterThan, qtyLessThan, qtyNearlyEqual } from "./qty-math.js";

export type ReceiveLineContext = {
  itemId: string;
  lineId: string;
  dispatchedQty: number;
  previousReceived: number;
  previousAccepted: number;
  previousRejected: number;
};

export type ValidatedReceiveLine = ReceiveLineContext & {
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason: string | null;
  deltaReceived: number;
  deltaAccepted: number;
  deltaRejected: number;
};

export function validateReceiveLine(
  context: ReceiveLineContext,
  receiveLine: ReceiveStockTransferLineInput,
): ValidatedReceiveLine {
  const receivedQty = receiveLine.received_qty;
  const acceptedQty = receiveLine.accepted_qty;
  const rejectedQty = receiveLine.rejected_qty ?? Math.max(0, receivedQty - acceptedQty);

  if (!Number.isFinite(receivedQty) || receivedQty < 0) {
    throw new TransferValidationError("Received quantity must be >= 0");
  }
  if (!Number.isFinite(acceptedQty) || acceptedQty < 0) {
    throw new TransferValidationError("Accepted quantity must be >= 0");
  }
  if (qtyLessThan(receivedQty, context.previousReceived)) {
    throw new TransferValidationError("Received quantity cannot decrease on subsequent receives");
  }
  if (qtyGreaterThan(receivedQty, context.dispatchedQty)) {
    throw new TransferValidationError("Received quantity cannot exceed dispatched quantity");
  }
  if (qtyGreaterThan(acceptedQty, receivedQty)) {
    throw new TransferValidationError("Accepted quantity cannot exceed received quantity");
  }
  if (!qtyNearlyEqual(acceptedQty + rejectedQty, receivedQty)) {
    throw new TransferValidationError("Accepted and rejected quantities must equal received quantity");
  }
  if (qtyGreaterThan(rejectedQty, 0) && !receiveLine.rejection_reason?.trim()) {
    throw new TransferValidationError("Rejection reason is required when quantity is rejected");
  }

  const deltaAccepted = acceptedQty - context.previousAccepted;
  const deltaRejected = rejectedQty - context.previousRejected;
  const deltaReceived = receivedQty - context.previousReceived;

  if (!qtyNearlyEqual(deltaAccepted + deltaRejected, deltaReceived)) {
    throw new TransferValidationError("Accepted and rejected deltas must equal received delta");
  }
  if (qtyLessThan(deltaAccepted, 0) || qtyLessThan(deltaRejected, 0)) {
    throw new TransferValidationError("Accepted and rejected quantities cannot decrease");
  }

  return {
    ...context,
    receivedQty,
    acceptedQty,
    rejectedQty,
    rejectionReason: receiveLine.rejection_reason?.trim() || null,
    deltaReceived,
    deltaAccepted,
    deltaRejected,
  };
}

export async function applyReceiveLineStockMovements(
  tx: StockTx,
  params: {
    tenantId: string;
    toStoreId: string;
    itemId: string;
    transferDate: string;
    line: ValidatedReceiveLine;
    allocations: StockAllocation[];
  },
): Promise<void> {
  if (qtyGreaterThan(params.line.deltaAccepted, 0)) {
    await creditAcceptedFromAllocations(tx, {
      tenantId: params.tenantId,
      destStoreId: params.toStoreId,
      itemId: params.itemId,
      transferDate: params.transferDate,
      allocations: params.allocations,
      acceptedQty: params.line.deltaAccepted,
    });
  }

  if (qtyGreaterThan(params.line.deltaRejected, 0)) {
    await returnRejectedFromAllocations(
      tx,
      params.tenantId,
      params.allocations,
      params.line.deltaRejected,
    );
  }
}

export function resolveReceiveStatus(
  totalAccepted: number,
  allLinesFullyReceived: boolean,
): "rejected" | "partially_received" | "completed" {
  if (totalAccepted <= 0 && allLinesFullyReceived) return "rejected";
  if (!allLinesFullyReceived) return "partially_received";
  return "completed";
}
