import type { UseQueryResult } from '@tanstack/react-query';
import {
  DUMMY_INVENTORY_DASHBOARD,
  DUMMY_INVENTORY_STOCK,
  DUMMY_INVENTORY_STORES,
} from '../dummy-data';
import type {
  InventoryDashboardData,
  InventoryListParams,
  InventoryStockListData,
  InventoryStockRow,
  InventoryStore,
} from '../types';

type QueryResult<T> = Pick<UseQueryResult<T>, 'data' | 'isLoading' | 'error'>;

function filterStockRows(rows: InventoryStockRow[], params: InventoryListParams): InventoryStockRow[] {
  let filtered = rows;
  const query = params.search?.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(
      (row) =>
        row.item_name.toLowerCase().includes(query) ||
        row.item_code.toLowerCase().includes(query),
    );
  }
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((row) => row.status === params.status);
  }
  return filtered;
}

/** Swap to `useQuery` when inventory-svc endpoints are available. */
export function useInventoryStores(): QueryResult<InventoryStore[]> {
  return { data: DUMMY_INVENTORY_STORES, isLoading: false, error: null };
}

export function useInventoryDashboard(_storeId?: string): QueryResult<InventoryDashboardData> {
  return { data: DUMMY_INVENTORY_DASHBOARD, isLoading: false, error: null };
}

export function useInventoryStock(params: InventoryListParams = {}): QueryResult<InventoryStockListData> {
  const rows = filterStockRows(DUMMY_INVENTORY_STOCK.data, params);
  const summary = rows.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    { critical: 0, low: 0, normal: 0 },
  );
  return {
    data: { data: rows, total: rows.length, summary },
    isLoading: false,
    error: null,
  };
}
