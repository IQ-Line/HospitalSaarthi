import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { DrizzleInventoryTransferRepository } from "../data-access/transfer.repo.js";
import type { CreateStockTransferInput } from "../domain/transfer.types.js";
import { IndentNotFoundError, TransferValidationError } from "../errors.js";
import type { StoreRepo } from "../ports.js";
import { getStockTransfer } from "./get-stock-transfer.js";

export type CreateStockTransferDeps = {
  transferRepo: DrizzleInventoryTransferRepository;
  indentRepo: DrizzleInventoryIndentRepository;
  storeRepo: StoreRepo;
};

async function assertStoresActive(
  deps: CreateStockTransferDeps,
  tenantId: string,
  fromStoreId: string,
  toStoreId: string,
) {
  const [fromStore, toStore] = await Promise.all([
    deps.storeRepo.findById(tenantId, fromStoreId),
    deps.storeRepo.findById(tenantId, toStoreId),
  ]);
  if (!fromStore?.is_active || !toStore?.is_active) {
    throw new TransferValidationError("Both stores must be active");
  }
}

async function assertIndentEligible(
  deps: CreateStockTransferDeps,
  tenantId: string,
  indentId: string,
  input: CreateStockTransferInput,
) {
  const indent = await deps.indentRepo.findById(tenantId, indentId);
  if (!indent) throw new IndentNotFoundError();
  if (indent.fulfillment_route !== "stock_transfer") {
    throw new TransferValidationError("Only stock-transfer indents can create transfers");
  }
  if (!["approved", "partially_approved"].includes(indent.status)) {
    throw new TransferValidationError("Indent must be approved before creating a transfer");
  }
  if (indent.inventory_stock_transfer_id) {
    throw new TransferValidationError("Indent already has a linked transfer");
  }
  if (!indent.to_store_id) {
    throw new TransferValidationError("Indent is missing fulfilling store");
  }
  if (input.from_store_id !== indent.to_store_id || input.to_store_id !== indent.from_store_id) {
    throw new TransferValidationError("Transfer stores must match the approved indent route");
  }

  const indentLines = await deps.indentRepo.listLines(tenantId, indentId);
  const approvedByItem = new Map(
    indentLines.map((line) => [line.item_id, Number(line.approved_qty ?? 0)]),
  );
  for (const line of input.lines) {
    const approved = approvedByItem.get(line.item_id) ?? 0;
    if (approved <= 0) {
      throw new TransferValidationError("Transfer line item was not approved on the indent");
    }
    if (line.transfer_qty > approved) {
      throw new TransferValidationError("Transfer quantity cannot exceed approved quantity");
    }
  }
}

export async function createStockTransfer(
  deps: CreateStockTransferDeps,
  tenantId: string,
  input: CreateStockTransferInput,
  actorId: string | null,
) {
  if (!input.lines.length) {
    throw new TransferValidationError("Transfer must have at least one line");
  }

  await assertStoresActive(deps, tenantId, input.from_store_id, input.to_store_id);

  if (input.inventory_indent_id) {
    await assertIndentEligible(deps, tenantId, input.inventory_indent_id, input);
  }

  const row = await deps.transferRepo.createDraft(tenantId, input, actorId);

  return getStockTransfer(
    { transferRepo: deps.transferRepo, indentRepo: deps.indentRepo },
    tenantId,
    row.id,
  );
}
