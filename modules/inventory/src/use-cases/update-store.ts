import type { UpdateStoreInput } from "../domain/store.types.js";
import type { InventoryDeps } from "../ports.js";
import type { StoreRow } from "../domain/store.types.js";
import { StoreNotFoundError, StoreTypeNotFoundError, StoreValidationError } from "../errors.js";

export async function updateStore(
  deps: Pick<InventoryDeps, "storeRepo" | "masterDataGateway">,
  tenantId: string,
  storeId: string,
  input: UpdateStoreInput,
  actorId: string | null,
  bearerToken?: string,
): Promise<StoreRow> {
  if (input.store_name !== undefined && !input.store_name.trim()) {
    throw new StoreValidationError("Store name cannot be empty.");
  }

  if (input.store_type_id) {
    const storeType = await deps.masterDataGateway.getStoreTypeById(
      tenantId,
      input.store_type_id,
      bearerToken,
    );
    if (!storeType) {
      throw new StoreTypeNotFoundError();
    }
  }

  const row = await deps.storeRepo.update(tenantId, storeId, input, actorId);
  if (!row) {
    throw new StoreNotFoundError();
  }
  return row;
}
