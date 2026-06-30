import type { CreateStoreInput } from "../domain/store.types.js";
import type { InventoryDeps } from "../ports.js";
import type { StoreRow } from "../domain/store.types.js";
import { StoreTypeNotFoundError, StoreValidationError } from "../errors.js";

export async function createStore(
  deps: Pick<InventoryDeps, "storeRepo" | "masterDataGateway">,
  tenantId: string,
  input: CreateStoreInput,
  actorId: string | null,
  bearerToken?: string,
): Promise<StoreRow> {
  const name = input.store_name?.trim();
  if (!name) {
    throw new StoreValidationError("Store name is required.");
  }
  if (!input.store_type_id?.trim()) {
    throw new StoreValidationError("Store type is required.");
  }
  if (!input.facility_id?.trim()) {
    throw new StoreValidationError("Facility is required.");
  }
  if (!input.department_id?.trim()) {
    throw new StoreValidationError("Department is required.");
  }

  const storeType = await deps.masterDataGateway.getStoreTypeById(
    tenantId,
    input.store_type_id,
    bearerToken,
  );
  if (!storeType) {
    throw new StoreTypeNotFoundError();
  }

  return deps.storeRepo.create(
    tenantId,
    storeType.code,
    {
      ...input,
      store_name: name,
      can_receive_stock: input.can_receive_stock ?? storeType.can_receive_stock,
      can_dispense: input.can_dispense ?? storeType.can_dispense,
      can_issue_to_ward: input.can_issue_to_ward ?? storeType.can_issue_to_ward,
      track_batch_expiry: input.track_batch_expiry ?? storeType.track_batch_expiry,
      indent_authority: input.indent_authority ?? storeType.indent_authority,
    },
    actorId,
  );
}
