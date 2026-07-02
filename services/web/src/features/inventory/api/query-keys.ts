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
  dashboard: (storeId?: string) => [...inventoryQueryKeys.all, 'dashboard', storeId] as const,
  stock: (params: InventoryListParams) => [...inventoryQueryKeys.all, 'stock', params] as const,
  stockLots: (itemId: string, storeId?: string) =>
    [...inventoryQueryKeys.all, 'stock-lots', itemId, storeId] as const,
  indents: (params: InventoryIndentListParams) => [...inventoryQueryKeys.all, 'indents', params] as const,
  indentActiveCheck: (params: {
    from_store_id: string;
    to_store_id?: string;
    item_id: string;
    exclude_indent_id?: string;
  }) => [...inventoryQueryKeys.all, 'indent-active-check', params] as const,
  grnLogs: (params: InventoryGrnListParams) => [...inventoryQueryKeys.all, 'grn-logs', params] as const,
  transfers: (params: InventoryTransferListParams) => [...inventoryQueryKeys.all, 'transfers', params] as const,
  reconciliation: () => [...inventoryQueryKeys.all, 'reconciliation'] as const,
};

/** inventory-svc operational APIs (proxied at `/api/inventory/v1`). */
export const INVENTORY_API_BASE = '/api/inventory/v1';
