import type { InventoryListParams } from '../types';

export const inventoryQueryKeys = {
  all: ['inventory'] as const,
  stores: () => [...inventoryQueryKeys.all, 'stores'] as const,
  dashboard: (storeId?: string) => [...inventoryQueryKeys.all, 'dashboard', storeId] as const,
  stock: (params: InventoryListParams) => [...inventoryQueryKeys.all, 'stock', params] as const,
};

/** Future BFF base path for inventory operational APIs. */
export const INVENTORY_API_BASE = '/api/v1/inventory';
