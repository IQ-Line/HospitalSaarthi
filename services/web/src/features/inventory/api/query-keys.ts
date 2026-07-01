import type {
  InventoryGrnListParams,
  InventoryIndentListParams,
  InventoryListParams,
  InventoryTransferListParams,
} from '../types';

export const inventoryQueryKeys = {
  all: ['inventory'] as const,
  stores: () => [...inventoryQueryKeys.all, 'stores'] as const,
  items: () => [...inventoryQueryKeys.all, 'items'] as const,
  manufacturers: () => [...inventoryQueryKeys.all, 'manufacturers'] as const,
  dashboard: (storeId?: string) => [...inventoryQueryKeys.all, 'dashboard', storeId] as const,
  stock: (params: InventoryListParams) => [...inventoryQueryKeys.all, 'stock', params] as const,
  stockLots: (stockId: string) => [...inventoryQueryKeys.all, 'stock-lots', stockId] as const,
  indents: (params: InventoryIndentListParams) => [...inventoryQueryKeys.all, 'indents', params] as const,
  grnLogs: (params: InventoryGrnListParams) => [...inventoryQueryKeys.all, 'grn-logs', params] as const,
  transfers: (params: InventoryTransferListParams) => [...inventoryQueryKeys.all, 'transfers', params] as const,
  reconciliation: () => [...inventoryQueryKeys.all, 'reconciliation'] as const,
};

/** Future BFF base path for inventory operational APIs. */
export const INVENTORY_API_BASE = '/api/inventory/v1';
