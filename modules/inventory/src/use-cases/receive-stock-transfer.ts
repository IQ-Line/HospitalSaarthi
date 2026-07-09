import type { DrizzleInventoryIndentRepository } from "../data-access/indent.repo.js";
import type { DrizzleInventoryTransferRepository } from "../data-access/transfer.repo.js";
import type { ReceiveStockTransferInput } from "../domain/transfer.types.js";
import { TransferNotFoundError } from "../errors.js";
import { getStockTransfer } from "./get-stock-transfer.js";

export type ReceiveStockTransferDeps = {
  transferRepo: DrizzleInventoryTransferRepository;
  indentRepo: DrizzleInventoryIndentRepository;
};

export async function receiveStockTransfer(
  deps: ReceiveStockTransferDeps,
  tenantId: string,
  transferId: string,
  input: ReceiveStockTransferInput,
) {
  const existing = await deps.transferRepo.findById(tenantId, transferId);
  if (!existing) throw new TransferNotFoundError();

  await deps.transferRepo.receive(tenantId, transferId, input);

  return getStockTransfer(
    { transferRepo: deps.transferRepo, indentRepo: deps.indentRepo },
    tenantId,
    transferId,
  );
}
