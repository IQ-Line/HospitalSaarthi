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

  const existing = await deps.storeRepo.findById(tenantId, storeId);
  if (!existing) {
    throw new StoreNotFoundError();
  }

  const indentAuthority = input.indent_authority ?? existing.indent_authority;
  let indentTargetStoreId =
    input.indent_target_store_id !== undefined
      ? input.indent_target_store_id
      : existing.indent_target_store_id;

  if (!indentAuthority) {
    indentTargetStoreId = null;
  } else if (!indentTargetStoreId?.trim()) {
    throw new StoreValidationError(
      "Indent target store is required when indent authority is enabled.",
    );
  } else if (indentTargetStoreId === storeId) {
    throw new StoreValidationError("Indent target store cannot be the same store.");
  }

  const row = await deps.storeRepo.update(
    tenantId,
    storeId,
    {
      ...input,
      indent_authority: indentAuthority,
      indent_target_store_id: indentTargetStoreId,
    },
    actorId,
  );
  if (!row) {
    throw new StoreNotFoundError();
  }
  return row;
}
