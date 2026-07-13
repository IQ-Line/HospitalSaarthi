import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import {
  extractItemMasterPricing,
  type ItemMasterPricingSnapshot,
} from "../lib/item-master-pricing.js";

export type GetItemDispensePricingDeps = {
  itemRepo: DrizzleInventoryItemRepository;
};

export async function getItemDispensePricingById(
  deps: GetItemDispensePricingDeps,
  tenantId: string,
  itemId: string,
): Promise<ItemMasterPricingSnapshot | null> {
  const trimmed = itemId.trim();
  if (!trimmed) return null;

  const row = await deps.itemRepo.findById(tenantId, trimmed);
  if (!row || !row.is_active) return null;

  return extractItemMasterPricing(row);
}
