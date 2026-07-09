import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { DrizzleInventoryTransferRepository } from "../data-access/transfer.repo.js";
import type { DispatchStockTransferInput } from "../domain/transfer.types.js";
import { TransferNotFoundError } from "../errors.js";
import { getStockTransfer } from "./get-stock-transfer.js";

export type DispatchStockTransferDeps = {
  transferRepo: DrizzleInventoryTransferRepository;
  indentRepo: DrizzleInventoryIndentRepository;
};

export async function dispatchStockTransfer(
  deps: DispatchStockTransferDeps,
  tenantId: string,
  transferId: string,
  input: DispatchStockTransferInput,
) {
  const existing = await deps.transferRepo.findById(tenantId, transferId);
  if (!existing) throw new TransferNotFoundError();

  await deps.transferRepo.dispatch(tenantId, transferId, input);

  return getStockTransfer(
    { transferRepo: deps.transferRepo, indentRepo: deps.indentRepo },
    tenantId,
    transferId,
  );
}
