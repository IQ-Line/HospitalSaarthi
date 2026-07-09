import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { DrizzleInventoryTransferRepository } from "../data-access/transfer.repo.js";
import type { CancelStockTransferInput } from "../domain/transfer.types.js";
import { TransferNotFoundError } from "../errors.js";
import { getStockTransfer } from "./get-stock-transfer.js";

export type CancelStockTransferDeps = {
  transferRepo: DrizzleInventoryTransferRepository;
  indentRepo: DrizzleInventoryIndentRepository;
};

export async function cancelStockTransfer(
  deps: CancelStockTransferDeps,
  tenantId: string,
  transferId: string,
  input: CancelStockTransferInput,
) {
  const existing = await deps.transferRepo.findById(tenantId, transferId);
  if (!existing) throw new TransferNotFoundError();

  await deps.transferRepo.cancel(tenantId, transferId, input);

  return getStockTransfer(
    { transferRepo: deps.transferRepo, indentRepo: deps.indentRepo },
    tenantId,
    transferId,
  );
}
