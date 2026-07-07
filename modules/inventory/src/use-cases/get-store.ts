import type { InventoryDeps } from "../ports.js";
import type { StoreRow } from "../domain/store.types.js";
import { StoreNotFoundError } from "../errors.js";

export async function getStore(
  deps: Pick<InventoryDeps, "storeRepo">,
  tenantId: string,
  storeId: string,
): Promise<StoreRow> {
  const row = await deps.storeRepo.findById(tenantId, storeId);
  if (!row) {
    throw new StoreNotFoundError();
  }
  return row;
}
