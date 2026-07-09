import type { StoreRepo } from "../ports.js";
import { StoreConflictError } from "../errors.js";

/** Ensures at most one central (procurement) store exists per tenant. */
export async function assertSingleCentralStore(
  storeRepo: StoreRepo,
  tenantId: string,
  isCentralStore: boolean,
  excludeStoreId?: string,
): Promise<void> {
  if (!isCentralStore) return;

  const existing = await storeRepo.findCentralStore(tenantId);
  if (existing && existing.id !== excludeStoreId) {
    throw new StoreConflictError(
      "This tenant already has a central store. Only one procurement store is allowed.",
    );
  }
}
