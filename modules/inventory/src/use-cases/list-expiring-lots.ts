import type { DrizzleInventoryStockRepository } from "../data-access/stock.repo.js";
import type { StoreRepo } from "../ports.js";
import { StoreNotFoundError, StoreValidationError } from "../errors.js";
import type { ListExpiringLotsQuery } from "../domain/stock.types.js";

export const DEFAULT_EXPIRING_LOTS_WINDOW_DAYS = 30;

export type ListExpiringLotsDeps = {
  stockRepo: DrizzleInventoryStockRepository;
  storeRepo: StoreRepo;
};

async function assertActiveStore(deps: ListExpiringLotsDeps, tenantId: string, storeId: string) {
  const store = await deps.storeRepo.findById(tenantId, storeId);
  if (!store) throw new StoreNotFoundError();
  if (!store.is_active) throw new StoreValidationError("Store must be active");
  return store;
}

export async function listExpiringLots(
  deps: ListExpiringLotsDeps,
  tenantId: string,
  query: ListExpiringLotsQuery,
) {
  await assertActiveStore(deps, tenantId, query.store_id);
  const withinDays = query.within_days ?? DEFAULT_EXPIRING_LOTS_WINDOW_DAYS;
  const pageSize = query.page_size ?? 100;

  const [total, data] = await Promise.all([
    deps.stockRepo.countExpiringLots(tenantId, query.store_id, withinDays),
    deps.stockRepo.listExpiringLots(tenantId, query.store_id, withinDays, pageSize),
  ]);

  return { data, total, within_days: withinDays };
}
