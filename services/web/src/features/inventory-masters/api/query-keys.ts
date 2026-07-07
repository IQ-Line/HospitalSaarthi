import type { InventoryMasterListParams } from '../types';

export const inventoryMastersQueryKeys = {
  all: ['inventory-masters'] as const,
  items: (params: InventoryMasterListParams) =>
    [...inventoryMastersQueryKeys.all, 'items', params] as const,
  categories: (params: InventoryMasterListParams) =>
    [...inventoryMastersQueryKeys.all, 'categories', params] as const,
  itemTypes: (params: InventoryMasterListParams) =>
    [...inventoryMastersQueryKeys.all, 'item-types', params] as const,
  uoms: (params: InventoryMasterListParams) =>
    [...inventoryMastersQueryKeys.all, 'uoms', params] as const,
  storageConditions: (params: InventoryMasterListParams) =>
    [...inventoryMastersQueryKeys.all, 'storage-conditions', params] as const,
  hsnGst: (params: InventoryMasterListParams) =>
    [...inventoryMastersQueryKeys.all, 'hsn-gst', params] as const,
  manufacturers: (params: InventoryMasterListParams) =>
    [...inventoryMastersQueryKeys.all, 'manufacturers', params] as const,
  storeTypes: (params: InventoryMasterListParams) =>
    [...inventoryMastersQueryKeys.all, 'store-types', params] as const,
};

/** Future API base path for inventory master-data endpoints. */
export const INVENTORY_MASTERS_API_BASE = '/api/v1/master-data/inventory';

/** Operational item catalog (inventory-svc). */
export const INVENTORY_ITEMS_API_BASE = '/api/inventory/v1/items';
