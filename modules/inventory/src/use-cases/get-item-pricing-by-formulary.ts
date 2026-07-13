import type { DrizzleInventoryItemRepository } from "../data-access/items.repo.js";
import {
  extractItemMasterPricing,
  type ItemMasterPricingSnapshot,
} from "../lib/item-master-pricing.js";

export type GetItemPricingByFormularyDeps = {
  itemRepo: DrizzleInventoryItemRepository;
};

export async function getItemPricingByFormularyId(
  deps: GetItemPricingByFormularyDeps,
  tenantId: string,
  tenantFormularyId: string,
): Promise<ItemMasterPricingSnapshot | null> {
  const trimmed = tenantFormularyId.trim();
  if (!trimmed) return null;

  const row = await deps.itemRepo.findByTenantFormularyId(tenantId, trimmed);
  if (!row || !row.is_active) return null;

  return extractItemMasterPricing(row);
}
