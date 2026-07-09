import type { ListStoresQuery, StoreRow } from "../domain/store.types.js";
import type { InventoryDeps } from "../ports.js";

export async function listStores(
  deps: Pick<InventoryDeps, "storeRepo">,
  tenantId: string,
  query: ListStoresQuery,
): Promise<{ data: StoreRow[]; total: number }> {
  const { rows, total } = await deps.storeRepo.list(tenantId, query);
  return { data: rows, total };
}
